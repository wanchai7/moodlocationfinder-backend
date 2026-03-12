const fs = require('fs');
const files = [
    'models/Contact.js',
    'models/EmailLog.js',
    'controllers/contactController.js',
    'routes/contactRoutes.js'
];
files.forEach(f => {
    try {
        if(fs.existsSync(f)) {
            fs.unlinkSync(f);
            console.log('Deleted ' + f);
        } else {
            console.log('File ' + f + ' does not exist.');
        }
    } catch (e) {
        console.error('Failed to delete ' + f + ': ' + e.message);
    }
});
