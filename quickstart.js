const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');

let SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
let TOKEN_DIR = `${(process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE)}/.credentials/`;
let TOKEN_PATH = `${TOKEN_DIR}calendar-nodejs-quickstart.json`;

fs.readFile('client_secret.json', 'utf-8', (err, content) => {
    if (err) {
        console.log(`Error loading client secret file: ${err}`);
        return;
    }
    
    authorize(JSON.parse(content), listEvents);
});

const authorize = (credentials, callback) => {
    let { client_secret, client_id, redirect_uris } = credentials.installed;

    let auth = new googleAuth();
    let oauth2Client = new auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
};

const getNewToken = (oauth2Client, callback) => {
    let authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });

    console.log(`Authorize this app by visiting this url: `, authUrl);
    let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter that code from that page here: ', code => {
        rl.close();
        oauth2Client.getToken(code, (err, token) => {
            if (err) {
                console.log('Error while trying to retrieve access token: ', err);
                return;
            }
            console.log('token', token);
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

const storeToken = token => {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }

    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log(`Token stored to ${TOKEN_PATH}`);
};

const listEvents = auth => {
    let calendar = google.calendar('v3');
    calendar.events.list({
        auth,
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
    }, (err, response) => {
        if (err) {
            console.log(`The API returned error: ${err}`);
            return;
        }

        let events = response.items;
        if (events.length === 0) {
            console.log('No upcoming events found.');
        } else {
            console.log('Upcoming 10 events');
            events.map(event => {
                let start = event.start.dateTime || event.start.date;
                console.log('%s - %s', start, event.summary);
            });
        }
    });
};