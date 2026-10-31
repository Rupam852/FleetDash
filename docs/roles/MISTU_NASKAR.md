# Role Specification: Database & Storage Engineer
* **Assignee:** Mistu Naskar (`mamma30y`)
* **Email:** mammamroy75@gmail.com
* **Branch:** `member-mistu`

## Core Responsibilities
* MongoDB Time-Series Bucket Pattern schema design
* Hourly sample pre-allocation (3,600 coordinates/bucket)
* Compound indexing `{ vehicleId: 1, bucketStartTime: -1 }`
* Sub-5ms database query SLA optimization
