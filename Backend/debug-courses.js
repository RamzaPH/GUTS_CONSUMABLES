const db = require('./config/database');
const Course = require('./models/Course');

(async () => {
  try {
    await db.authenticate();
    const courses = await Course.findAll();
    console.log('Courses:', courses.length);
    courses.forEach(c => console.log(`ID:${c.id} Code:${c.code} Name:${c.name} Active:${c.isActive}`));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
