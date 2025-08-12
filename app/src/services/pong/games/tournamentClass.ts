import { Player } from "./playerClass";

export interface TournamentMatch {
	player1: Player | null;
	player2: Player | null;
	winner: Player | null;
}

export class Tournament {
	players: Player[];
	rounds: TournamentMatch[][];
	private currentRound = 0;
	private currentMatchIndex = 0;

	constructor(players: Player[]) {
		this.players = players;
		this.rounds = this.generateBracket(players);
		// this.autoAdvanceByes(); // Handle auto-wins from BYEs
	}

	private generateBracket(players: Player[]): TournamentMatch[][] {
		if (players.length === 1) {
			return [[{
				player1: players[0],
				player2: null,
				winner: players[0],
			}]];
		}

		const totalPlayers = players.length;
		const nextPower = 2 ** Math.ceil(Math.log2(totalPlayers));
		const padded: (Player | null)[] = [...players];

		while (padded.length < nextPower) {
			padded.push(null);
		}

		const rounds: TournamentMatch[][] = [];

		const firstRound: TournamentMatch[] = [];
		for (let i = 0; i < padded.length; i += 2) {
			firstRound.push({
				player1: padded[i],
				player2: padded[i + 1],
				winner: null,
			});
		}
		rounds.push(firstRound);

		let matchCount = firstRound.length;
		while (matchCount > 1) {
			const nextRound: TournamentMatch[] = Array.from({ length: Math.ceil(matchCount / 2) }, () => ({
				player1: null,
				player2: null,
				winner: null,
			}));
			rounds.push(nextRound);
			matchCount = nextRound.length;
		}

		return rounds;
	}


	// private autoAdvanceByes(): void {
	// 	let changed = true;
	// 	while (changed && !this.isFinished()) {
	// 		const match = this.getCurrentMatch();
	// 		if (!match) break;

	// 		const { player1, player2 } = match;

	// 		if (player1 && !player2) {
	// 			this.advance(player1);
	// 			changed = true;
	// 		} else if (!player1 && player2) {
	// 			this.advance(player2);
	// 			changed = true;
	// 		}
	// 	}
	// }

	advance(winner: Player): void {
		const round = this.rounds[this.currentRound];
		const match = round[this.currentMatchIndex];

		if (!match) throw new Error("No match to advance");
		if (match.winner) throw new Error("This match already has a winner");

		if (
			match.player1?.playerId !== winner.playerId &&
			match.player2?.playerId !== winner.playerId
		) {
			throw new Error("Winner is not part of the current match");
		}

		match.winner = winner;

		// Place winner into next round
		if (this.currentRound + 1 < this.rounds.length) {
			const nextMatchIndex = Math.floor(this.currentMatchIndex / 2);
			const slot = this.currentMatchIndex % 2 === 0 ? 'player1' : 'player2';
			const nextMatch = this.rounds[this.currentRound + 1][nextMatchIndex];
			nextMatch[slot] = winner;
		}

		// Move to next match
		this.currentMatchIndex++;
		if (this.currentMatchIndex >= round.length) {
			this.currentRound++;
			this.currentMatchIndex = 0;
		}

		// this.autoAdvanceByes(); // handle BYEs again if new match is one-sided
	}

	rebuild(players: Player[]): void {
		this.players = players;
		this.rounds = this.generateBracket(players);
		this.currentRound = 0;
		this.currentMatchIndex = 0;
		// this.autoAdvanceByes();
	}

	getBracketJSON(): any[] {
		return this.rounds.map(round =>
			round.map(match => ({
				player1: match.player1
					? { id: match.player1.playerId, name: match.player1.displayName, title: match.player1.playerTitle }
					: null,
				player2: match.player2
					? { id: match.player2.playerId, name: match.player2.displayName, title: match.player2.playerTitle }
					: null,
				winner: match.winner
					? { id: match.winner.playerId, name: match.winner.displayName }
					: null,
			}))
		);
	}

	getCurrentMatch(): TournamentMatch | null {
		if (this.isFinished()) return null;
		return this.rounds[this.currentRound]?.[this.currentMatchIndex] ?? null;
	}

	getCurrentPlayerId(): { id: number | null; id2: number | null } {
		const match = this.getCurrentMatch();
		return {
			id: match?.player1?.playerId ?? null,
			id2: match?.player2?.playerId ?? null,
		};
	}

	isFinished(): boolean {
		const lastRound = this.rounds[this.rounds.length - 1];
		return !!lastRound?.[0]?.winner;
	}

	getWinner(): Player | null {
		if (!this.isFinished()) return null;
		return this.rounds.at(-1)?.[0]?.winner ?? null;
	}
}
