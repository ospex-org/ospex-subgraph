class League {
  league: string;
  id: i32;

  constructor(league: string, id: i32) {
    this.league = league
    this.id = id
  }
}

let leagueLegend = new Array<League>(9)

leagueLegend[0] = new League("NCAAF", 1)
leagueLegend[1] = new League("NFL", 2)
leagueLegend[2] = new League("MLB", 3)
leagueLegend[3] = new League("NBA", 4)
leagueLegend[4] = new League("NCAAB", 5)
leagueLegend[5] = new League("NHL", 6)
leagueLegend[6] = new League("MMA", 7)
leagueLegend[7] = new League("WNBA", 8)
leagueLegend[8] = new League("CFL", 9)

export default leagueLegend