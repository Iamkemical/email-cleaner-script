require("dotenv").config({ path: `${process.cwd()}/.env` });

const Imap = require("node-imap");
const inspect = require("util").inspect;
const schedule = require("node-schedule");

const userEmail = process.env.USER_EMAIL;
const userPassword = process.env.USER_PASSWORD;
const emailHost = process.env.EMAIL_HOST;
const emailPort = parseInt(process.env.EMAIL_PORT);

let emails = process.env.BLACKLISTED_EMAILS;

let searchCriteriaArray = [];
let blackListedEmailCollection = emails.split(",");

blackListedEmailCollection.forEach((email) => {
  searchCriteriaArray.push(["FROM", email.trim()]);
});

const imap = new Imap({
  user: userEmail,
  password: userPassword,
  host: emailHost,
  port: emailPort,
  tls: true,
});

async function run() {
  imap.once("ready", function () {
    openInbox(async function (err, box) {
      if (err) {
        console.log("Error opening mailbox:", err);
        return;
      }
      console.log("Search Criteria:", searchCriteriaArray);
      for (let searchCriteria of searchCriteriaArray) {
        console.log("Searching with criteria:", searchCriteria);
        await new Promise((resolve, reject) => {
          imap.search([searchCriteria], function (err, results) {
            if (err) {
              reject(err);
              return;
            }

            if (!results || !results.length) {
              console.log("No emails found for criteria:", searchCriteria);
              resolve();
              return;
            }

            imap.setFlags(results, "\\Deleted", function (err) {
              if (err) {
                reject(err);
                return;
              }
              console.log(
                "Marked emails for deletion for criteria:",
                searchCriteria
              );
              imap.expunge(results, function (err) {
                if (err) {
                  reject(err);
                  return;
                }
                console.log("Deleted emails for criteria:", searchCriteria);
                resolve();
              });
            });
          });
        }).catch((err) => {
          console.error("Error processing criteria:", searchCriteria, err);
        });
      }

      imap.end();
    });
  });

  imap.once("error", function (err) {
    console.log(err);
  });

  imap.once("end", function () {
    console.log("Connection ended");
  });

  imap.connect();
}

function openInbox(cb) {
  imap.openBox("INBOX", false, cb);
}

// Schedule the script to run every 15 minutes

schedule.scheduleJob("*/5 * * * *", async function () {
  console.log("Running script...");
  await run();
  console.log("Script finished running...");
});
