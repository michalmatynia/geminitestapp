
# apply consistent look of components, buttons etc. to make
 components should be as reusable as possible. The source of truth is products

find components that are similar enough so that they can be reused and try to use one component instance instead of two or more different separate component

Scan  Types and Type Clusters and move them over to the respective features localised or shared types folder.
Scan for optimization opportunities Optimization and speed up processes
check Product section optimization opportunities and avoidance of unnecessary re-renders.

* npx tsc < -- here now
npx eslint
add tests
Run npm run lint.
Run npm run test and/or npm run test:e2e.

run npx tsc and resolve typescript issues one by one

Prepare a suite tests in vitests
 implement tanstack query all across application

Connect tanstack queries to a unified error logging and handling system.
connect all API to Error logging and handling system

TESTS
-use msw API mocking - DONE

PRISMA
npx prisma generate
npx prisma migrate dev
npx prisma migrate reset
npx prisma db push