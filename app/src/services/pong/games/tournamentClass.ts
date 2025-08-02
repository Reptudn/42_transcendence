import { Player } from "./playerClass";

export interface TournamentMatch {
    player1: Player | null;
    player2: Player | null;
    winner: Player | null;
}

export class Tournament {
    players: Player[];
    rounds: TournamentMatch[][];
    currentRound: number = 0;

    constructor(players: Player[]) {
        this.players = players;
        this.rounds = this.generateBracket(players);
    }

    private generateBracket(players: Player[]): TournamentMatch[][] {
        // Quarterfinals (4 matches)
        const qf: TournamentMatch[] = [];
        for (let i = 0; i < 8; i += 2) {
            qf.push({ player1: players[i] || null, player2: players[i + 1] || null, winner: null });
        }
        // Semifinals (2 matches), Final (1 match)
        const sf: TournamentMatch[] = [
            { player1: null, player2: null, winner: null },
            { player1: null, player2: null, winner: null }
        ];
        const final: TournamentMatch[] = [
            { player1: null, player2: null, winner: null }
        ];
        return [qf, sf, final];
    }

    advance(matchIndex: number, winner: Player) {
        const round = this.currentRound;
        this.rounds[round][matchIndex].winner = winner;

        // Place winner in next round
        if (round + 1 < this.rounds.length) {
            const nextMatch = Math.floor(matchIndex / 2);
            const slot = matchIndex % 2 === 0 ? 'player1' : 'player2';
            (this.rounds[round + 1][nextMatch] as any)[slot] = winner;
        }

        // If all matches in round are done, advance round
        if (this.rounds[round].every(m => m.winner !== null)) {
            this.currentRound++;
        }
    }

    getCurrentMatches(): TournamentMatch[] {
        return this.rounds[this.currentRound];
    }

    isFinished(): boolean {
        return this.currentRound >= this.rounds.length;
    }
}