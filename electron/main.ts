import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

let win: BrowserWindow;

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles(auth) {
  const drive = google.drive({ version: 'v3', auth });
  const fileId = '0B0rIOroc8moZc1BOQXVJMUdmaDA';
  drive.files.list({
    fileId,
    q: `'${fileId}' in parents`,
    spaces: 'drive',
    pageSize: 1000,
    fields: 'nextPageToken, files(id, name, parents, mimeType, modifiedTime)',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = res.data.files;
    if (files.length) {
      // files.map((file) => {
      //   console.log(`${file.name} (${file.id})`);
      // });
      win.webContents.send('getFilesResponse', files);
    } else {
      console.log('No files found.');
    }
  });
}

app.on('ready', createWindow);

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

ipcMain.on('getFiles', (event, arg) => {
  const files = fs.readdirSync(__dirname);
  // Load client secrets from a local file.
  fs.readFile('./credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), listFiles);
  });
});

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      backgroundThrottling: false
    }
  });

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, `/../../dist/electron-books/index.html`),
      protocol: 'file:',
      slashes: true,
    })
  );

  win.webContents.openDevTools();

  win.on('closed', () => {
    win = null;
  });
}
