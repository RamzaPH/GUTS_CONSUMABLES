const db = require('./config/database');
const Course = require('./models/Course');

(async () => {
  try {
    await db.authenticate();
    const [affected] = await Course.update({ code: 'SMAW' }, { where: { code: 'MEEEAW' } });
    console.log('Updated rows:', affected);
    const courses = await Course.findAll();
    courses.forEach(c => console.log(`ID:${c.id} Code:${c.code} Name:${c.name}`));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
