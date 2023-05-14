import {
  ContestCreated,
  ContestScored
} from "../generated/ospexCOR/ContestOracleResolved"
import {
  SpeculationCreated,
  SpeculationLocked,
  SpeculationScored,
  PositionCreated,
  Claim
} from "../generated/ospexCFP/CFPv1"
import { BigInt, Address } from '@graphprotocol/graph-ts'

import { Contest, Speculation, Position, User } from "../generated/schema"

import leagueLegend from "./leagueLegend"
import teamLegend from "./teamLegend"

class ContestStatus {
  static Unverified: string = "Unverified"
  static Verified: string = "Verified"
  static Pending: string = "Pending"
  static Scored: string = "Scored"
  static NotMatching: string = "NotMatching"
  static ScoredManually: string = "ScoredManually"
  static RequiresConfirmation: string = "RequiresConfirmation"
  static Void: string = "Void"
}

class WinSide {
  static TBD: string = "TBD"
  static Away: string = "Away"
  static Home: string = "Home"
  static Over: string = "Over"
  static Under: string = "Under"
  static Push: string = "Push"
  static Forfeit: string = "Forfeit"
  static Invalid: string = "Invalid"
  static Void: string = "Void"
}

class SpeculationStatus {
  static Open: string = "Open"
  static Locked: string = "Locked"
  static Closed: string = "Closed"
}

class PositionTypeSpecified {
  static Away: string = "Away"
  static Home: string = "Home"
  static Over: string = "Over"
  static Under: string = "Under"
}

// hardcoded address for settling speculations based on total
// this is the Goerli address and will need to change in production
const totalAddress = Address.fromString("0x8B047213ed5076aCB51BFF9Fce56ACcBD5474Ba4")

export function handleContestCreated(event: ContestCreated): void {

  // id field for unique identifier
  const id = event.params.id

  // create new contest with unique id
  const contest = new Contest(id.toString())

  // set contest fields
  contest.contestCreator = event.params.contestCreator
  contest.rundownId = event.params.rundownId
  contest.sportspageId = event.params.sportspageId
  contest.contestCreationId = event.params.contestCriteria.toString()
  contest.leagueId = <i32>parseInt(contest.contestCreationId!.substr(0,1))
  contest.awayTeamId = <i32>parseInt(contest.contestCreationId!.substr(1,4))
  contest.homeTeamId = <i32>parseInt(contest.contestCreationId!.substr(5,4))
  contest.eventTime = <i32>parseInt(contest.contestCreationId!.substr(9))
  contest.contestStatus = ContestStatus.Verified

  // determine league and team names
  for (let i = 0; i < leagueLegend.length; i++) {
    if (leagueLegend[i].id === contest.leagueId) {
      contest.league = leagueLegend[i].league
      break
    }
  }

  for (let i = 0; i < teamLegend.length; i++) {
    if (teamLegend[i].leagueId === contest.leagueId && teamLegend[i].id === contest.awayTeamId) {
      contest.awayTeam = teamLegend[i].team
      break
    }
  }

  for (let i = 0; i < teamLegend.length; i++) {
    if (teamLegend[i].leagueId === contest.leagueId && teamLegend[i].id === contest.homeTeamId) {
      contest.homeTeam = teamLegend[i].team
      break
    }
  }

  contest.save()
}

export function handleContestScored(event: ContestScored): void {

  const id = event.params.id

  let contest = Contest.load(id.toString())

  if (contest) {
    contest.awayScore = <i32>parseInt(event.params.awayScore.toString())
    contest.homeScore = <i32>parseInt(event.params.homeScore.toString())
    contest.contestStatus = ContestStatus.Scored
    contest.save()
  }

}

export function handleSpeculationCreated(event: SpeculationCreated): void {

  // id field for unique identifier
  const id = event.params.id

  // create new speculation with unique id
  const speculation = new Speculation(id.toString())

  // set speculation fields
  speculation.lockTime = <i32>parseInt(event.params.lockTime.toString())
  speculation.speculationScorer = event.params.speculationScorer
  speculation.theNumber = event.params.theNumber
  speculation.speculationCreator = event.params.speculationCreator
  speculation.contest = event.params.contestId.toString()
  speculation.contestId = event.params.contestId.toString()
  speculation.upperAmount = new BigInt(0)
  speculation.lowerAmount = new BigInt(0)
  speculation.winSide = WinSide.TBD
  speculation.speculationStatus = SpeculationStatus.Open

  speculation.save()

}

export function handleSpeculationLocked(event: SpeculationLocked): void {
  const id = event.params.id

  let speculation = Speculation.load(id.toString())

  if (speculation) {
    speculation.speculationStatus = SpeculationStatus.Locked
    speculation.save()
  }

}

export function handleSpeculationScored(event: SpeculationScored): void {
  const id = event.params.id

  let speculation = Speculation.load(id.toString())

  if (speculation) {
    speculation.speculationStatus = SpeculationStatus.Closed
    speculation.upperAmount = event.params.upperAmount
    speculation.lowerAmount = event.params.lowerAmount

    if (event.params.winSide === 1) {
      speculation.winSide = WinSide.Away
    } else if (event.params.winSide === 2) {
      speculation.winSide = WinSide.Home
    } else if (event.params.winSide === 3) {
      speculation.winSide = WinSide.Over
    } else if (event.params.winSide === 4) {
      speculation.winSide = WinSide.Under
    } else if (event.params.winSide === 5) {
      speculation.winSide = WinSide.Push
    } else if (event.params.winSide === 6) {
      speculation.winSide = WinSide.Forfeit
    } else if (event.params.winSide === 7) {
      speculation.winSide = WinSide.Invalid
    } else if (event.params.winSide === 8) {
      speculation.winSide = WinSide.Void
    }

    speculation.save()
  }

}

export function handlePositionCreated(event: PositionCreated): void {
  const id = event.params.id.toHex() + event.params.user.toHex() + event.params.positionType.toString()
  const speculationId = event.params.id
  const userId = event.params.user.toHex()

  let speculation = Speculation.load(speculationId.toString())
  let position = Position.load(id)
  let user = User.load(userId)
  let type: string | null

  // logic for determining specific position
  if (speculation && speculation.speculationScorer == totalAddress && event.params.positionType === 0) {
    type = PositionTypeSpecified.Over
  } else if (speculation && speculation.speculationScorer == totalAddress && event.params.positionType === 1) {
    type = PositionTypeSpecified.Under
  } else if (event.params.positionType === 0) {
    type = PositionTypeSpecified.Away
  } else if (event.params.positionType === 1) {
    type = PositionTypeSpecified.Home
  }

  if (speculation && event.params.positionType === 0) {
    speculation.upperAmount = speculation.upperAmount!.plus(event.params.amount)
  } else if (speculation && event.params.positionType === 1) {
    speculation.lowerAmount = speculation.lowerAmount!.plus(event.params.amount)
  }

  if (position) {
    position.amount! = position.amount!.plus(event.params.amount)
    position.contributedUponCreation = position.contributedUponCreation!.plus(event.params.contributionAmount)
  } else {
    position = new Position(id)
    position.speculation = event.params.id.toString()
    position.speculationId = event.params.id.toString()
    position.user = event.params.user.toHex()
    position.userId = event.params.user.toHex()
    position.amount = event.params.amount
    position.contributedUponCreation = event.params.contributionAmount
    if (type!) {
      position.positionType = type!
    }
    position.claimed = false
    position.amountClaimed = new BigInt(0)
  }

  if (!user) {
    user = new User(userId.toString())

    user.save()
  }

  position.save()
  speculation!.save()

}

export function handleClaim(event: Claim): void {

  const speculationId = event.params.id

  let speculation = Speculation.load(speculationId.toString())
  let position: Position | null

  // no id for position; position to load must be determined by speculation win side
  if (speculation) {
    if (speculation.winSide == "Away" || speculation.winSide == "Over") {
      position = Position.load(event.params.id.toHex() + event.params.user.toHex() + "0")
    } else if (speculation.winSide == "Home" || speculation.winSide == "Under") {
      position = Position.load(event.params.id.toHex() + event.params.user.toHex() + "1")
    } else if (speculation.winSide == "Invalid") {
      position = Position.load(event.params.id.toHex() + event.params.user.toHex() + "0")
    } else {
      position = Position.load(event.params.id.toHex() + event.params.user.toHex() + "1")
    }
    if (position) {
      position.claimed = true
      position.amountClaimed = event.params.amount
      position.contributedUponClaim = event.params.contributionAmount
      position.save()
    }
  }
}