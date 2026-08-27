import { db } from '../src/db/index.ts';
import { teams, teamGithubInstallations } from '../src/db/schema.ts';
import { isNotNull, eq, and } from 'drizzle-orm';

async function main() {
  const allTeams = await db.select().from(teams).where(isNotNull(teams.githubInstallationId));
  
  console.log(`Found ${allTeams.length} teams with existing github installations`);
  
  for (const team of allTeams) {
    if (team.githubInstallationId) {
      // Check if it already exists in the new table to prevent duplicates
      const existing = await db.select().from(teamGithubInstallations).where(
        and(
          eq(teamGithubInstallations.teamId, team.id),
          eq(teamGithubInstallations.installationId, team.githubInstallationId)
        )
      );
      
      if (existing.length === 0) {
        await db.insert(teamGithubInstallations).values({
          teamId: team.id,
          installationId: team.githubInstallationId
        });
        console.log(`Migrated installation ${team.githubInstallationId} for team ${team.id}`);
      }
    }
  }
  
  console.log('Migration complete');
  process.exit(0);
}

main().catch(console.error);
