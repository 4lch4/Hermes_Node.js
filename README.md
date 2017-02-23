# Hermes
A Discord chat bot written in Node.js using the Eris library. My intent is to use it as a middle-man between Discord and my text messages received on my Android phone.

This is accomplished using an Android app I wrote that forwards all of my received messages to a Firebase server where Hermes watches for any changes. As soon as a new message is received, it's sent to me and I can choose to reply, delete, or snooze the text message.

## Data Retention
Ideally, I don't want to keep any text messages on the Firebase server for longer than 24 hours, for various reasons. If need be, I can extend it for the sake of testing but before it's put in "production", rules must be put in place to remove text messages after as short a life span as possible to avoid any information leaking and being responsible.

## Dependencies
- Eris library
- Firebase Realtime Database
- Moment
