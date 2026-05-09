##backend

| Method | Endpoint                | What It Does                                      |
| ------ | ----------------------- | ------------------------------------------------- |
| `POST` | `/api/auth/register`    | Create account                                    |
| `POST` | `/api/auth/login`       | Login, return simple token                        |
| `POST` | `/api/record`           | Start codegen (your existing code)                |
| `POST` | `/api/cases`            | Save parsed steps from recording                  |
| `GET`  | `/api/cases`            | List cases for logged-in user                     |
| `POST` | `/api/cases/:id/assets` | Add asset (test data)                             |
| `POST` | `/api/run`              | `{caseId, assetId}` → execute dynamically         |
| `POST` | `/api/bob`              | `{steps}` → Bob returns suggested negative assets |


##frontend

| Page               | Route          | Purpose                                                                                                  |
| ------------------ | -------------- | -------------------------------------------------------------------------------------------------------- |
| **Login/Register** | `/` or `/auth` | Simple form, store token in localStorage                                                                 |
| **Record**         | `/record`      | Input URL → click "Start Recording" → codegen opens → user copies steps JSON → paste back → save as case |
| **Cases + Assets** | `/cases`       | List cases. Click case → see steps → add assets (positive/negative data sets)                            |
| **Run + Report**   | `/runs`        | Select case + asset → run → see screenshot + pass/fail                                                   |
