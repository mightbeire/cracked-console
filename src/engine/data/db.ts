import Database from "@tauri-apps/plugin-sql";
const DATABASE_URL="sqlite:cracked-console.db";
type DatabaseInstance=Awaited<ReturnType<typeof Database.load>>; let databasePromise:Promise<DatabaseInstance>|undefined;
export function getDatabase():Promise<DatabaseInstance>{databasePromise??=Database.load(DATABASE_URL).then(async db=>{await db.execute("PRAGMA foreign_keys = ON");return db;});return databasePromise;}
export interface PlanCounts { versions:number; weeks:number; days:number; activeDays:number; restDays:number; blocks:number; }
interface CountRow{count:number}
async function count(query:string){const db=await getDatabase();const rows=await db.select<CountRow[]>(query);const value=rows[0]?.count;if(typeof value!=="number")throw new Error(`Count query returned no numeric value: ${query}`);return value;}
export async function getPlanCounts():Promise<PlanCounts>{const [versions,weeks,days,activeDays,restDays,blocks]=await Promise.all([count("SELECT COUNT(*) AS count FROM curriculum_versions"),count("SELECT COUNT(*) AS count FROM curriculum_weeks"),count("SELECT COUNT(*) AS count FROM curriculum_days"),count("SELECT COUNT(*) AS count FROM curriculum_days WHERE is_rest_day=0"),count("SELECT COUNT(*) AS count FROM curriculum_days WHERE is_rest_day=1"),count("SELECT COUNT(*) AS count FROM curriculum_blocks")]);return{versions,weeks,days,activeDays,restDays,blocks};}
