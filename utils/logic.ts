import { Match, Wrestler } from '../types';
import { 
  INITIAL_ROSTER, 
  INITIAL_REPUTATION, 
  WIN_BASE_POINTS, 
  LOSS_BASE_POINTS,
  PARTICIPATION_POINTS,
  TITLE_POINTS,
  STREAK_BONUS_PER_WIN,
  HIGHER_REP_BONUS,
  LOWER_REP_PENALTY,
  LOSS_MITIGATION,
  LOSS_PENALTY
} from '../constants';

// Helper to initialize a wrestler map
const createEmptyWrestler = (name: string): Wrestler => ({
  name,
  wins: 0,
  losses: 0,
  matches: 0,
  streak: 0,
  maxStreak: 0,
  reputation: INITIAL_REPUTATION,
  titles: 0,
  history: [INITIAL_REPUTATION]
});

export const calculateStats = (matches: Match[], rosterNames: string[] = INITIAL_ROSTER): Record<string, Wrestler> => {
  const stats: Record<string, Wrestler> = {};

  // Initialize roster
  rosterNames.forEach(name => {
    stats[name] = createEmptyWrestler(name);
  });

  // Process matches in chronological order
  // Sort matches by timestamp just in case, though they should be stored ordered
  const sortedMatches = [...matches].sort((a, b) => a.timestamp - b.timestamp);

  sortedMatches.forEach(match => {
    const winner = stats[match.winner];
    const loser = stats[match.loser];

    if (!winner || !loser) return; // Skip if wrestler not found (e.g. deleted)

    const winnerPrevRep = winner.reputation;
    const loserPrevRep = loser.reputation;

    // --- Winner Calculation ---
    let winPoints = WIN_BASE_POINTS;
    
    // Rep factors
    if (loserPrevRep > winnerPrevRep) {
      winPoints += HIGHER_REP_BONUS;
    } else if (loserPrevRep < winnerPrevRep) {
      winPoints -= LOWER_REP_PENALTY;
    }

    // Streak factor (Applied based on EXISTING streak before this win)
    const streakBonus = winner.streak * STREAK_BONUS_PER_WIN;
    winPoints += streakBonus;

    // Title factor
    if (match.isTitleMatch) {
      winner.titles += 1;
      winPoints += TITLE_POINTS;
    }

    // Participation
    winPoints += PARTICIPATION_POINTS;

    // Apply Win Stats
    winner.wins += 1;
    winner.matches += 1;
    winner.streak += 1;
    if (winner.streak > winner.maxStreak) winner.maxStreak = winner.streak;
    winner.reputation += winPoints;


    // --- Loser Calculation ---
    let lossPoints = LOSS_BASE_POINTS; // This is a negative value magnitude

    // Rep factors for loss
    // Note: Logic says "Suma +10" implies mitigating the loss (less negative)
    // "Resta -20" implies aggravating the loss (more negative)
    let lossAdjustment = 0;

    if (winnerPrevRep > loserPrevRep) {
       // Rival has more rep, defeat is less shameful
       lossAdjustment += LOSS_MITIGATION; 
    } else if (winnerPrevRep < loserPrevRep) {
       // Rival has less rep, defeat is more shameful
       lossAdjustment -= LOSS_PENALTY;
    }

    // Calculate total change. Base loss is subtraction. Adjustment adds/subtracts from that subtraction.
    // Formula: NewRep = OldRep - BaseLoss + Participation + Adjustment
    // We treat "Loss Base" as 50. So usually -50.
    // If Adjustment is +10, result is -40. 
    // If Adjustment is -20, result is -70.
    
    let totalLossChange = -lossPoints + lossAdjustment + PARTICIPATION_POINTS;

    // Apply Loss Stats
    loser.losses += 1;
    loser.matches += 1;
    loser.streak = 0;
    loser.reputation += totalLossChange;

    // Update History
    winner.history.push(winner.reputation);
    loser.history.push(loser.reputation);
    
    // For everyone else in roster, push their current rep so graphs align on X-axis (matches)
    // Or we just push when they fight. Let's stick to pushing only when they fight to save memory,
    // but for a true timeline graph, we might want to normalize. 
    // For this implementation, we only track history on active updates.
  });

  return stats;
};
