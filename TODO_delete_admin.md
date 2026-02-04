# Delete Admin-Related Files and Data

## Files to Delete
- [ ] backend/models/AdminLogs.js
- [ ] backend/models/AdminSettings.js
- [ ] backend/models/Announcements.js
- [ ] backend/routes/admin.js
- [ ] backend/middleware/admin.js
- [ ] backend/create_admin.js
- [ ] backend/populate_db.js
- [ ] frontend/admin_complete.html
- [ ] frontend/admin_new.html
- [ ] TODO_admin_new.html
- [ ] TODO_admin_recreation.md
- [ ] simple_admin_test.js
- [ ] create_admin_manual.js
- [ ] test_admin_login.js
- [ ] set_admin.js

## Code Edits
- [ ] Remove admin creation logic from backend/server.js
- [ ] Remove isAdmin field from backend/models/User.js
- [ ] Remove admin link from frontend/index.html
- [ ] Remove admin redirect from frontend/login.html

## MongoDB Data Deletion
- [ ] Delete admin users (isAdmin: true or roles: ["admin"])
- [ ] Drop AdminLogs collection
- [ ] Drop AdminSettings collection
- [ ] Drop Announcements collection
