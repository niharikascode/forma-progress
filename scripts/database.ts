import { openDatabase, seed } from "../src/lib/database";
const db = await openDatabase();
if (process.argv[2] === "seed") await seed(db);
console.log(
  process.argv[2] === "seed"
    ? "Example workspace seeded."
    : "Database migrations applied.",
);
db.close();
