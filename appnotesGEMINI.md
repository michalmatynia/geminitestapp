
* analyze the structure of the whole Products section and carry out segmentation for better code management
Add try catch blocks for better bug handling in the Products section
Optimization and speed up processes
* Scan Products section for Types and Type Clusters and move them over to types folder.

* Check components in Products section and see if any of them or maybe parts of them can be made more reusable across application.
* npx tsc < -- here now
add comments
npx eslint
add tests
check Product section optimization opportunities and avoidance of unnecessary re-renders.

run npx tsc and resolve typescript issues one by one

npx prisma generate
npx prisma migrate dev
prisma migrate reset
npx prisma db push

Prepare a suite tests in vitests
use tanstack query across application

use ShadCN/ui (Product List - Done, Notificatoins - Done, )
Enable React Server Components - Implement  optimize frontend pages to fetch data server-side
 Add MSW 2.0 - Implement MSW Proper API mocking in all tests