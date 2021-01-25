const Discord = require("discord.js");
const firebase = require("firebase");
const moment = require("moment");

//Firebase Configuration
const firebaseConfig = {
    apiKey: process.env.APIKEY,
    authDomain: process.env.AUTH,
    projectId: process.env.PROJID,
    storageBucket: process.env.BUCKET,
    messagingSenderId: process.env.SENDID,
    appId: process.env.APPID,
    measurementId: process.env.MEASUREMENTID
};

firebase.initializeApp(firebaseConfig);

//Discord.js Configuration
const client = new Discord.Client();

client.once('ready', async () => {
    console.log('Ready!');
});

client.login(process.env.TOKEN);

//Discord Commands
client.on('message', async (message) => {
    //-ask Command
    if (message.content == "-ask") {
        //Fetches all questions in database
        const allquestions = [];
        await firebase
            .firestore()
            .collection("questions")
            .get()
            .then(querySnapshot => {
                querySnapshot.forEach(doc => {
                    allquestions.push(doc.data());
                });
            })


        if (allquestions.length != 0) {
            //Filters out all active questions
            var validQuestions = allquestions
                .filter(doc => moment(doc.date, 'YYYY-MM-DD').diff(moment(), "days") > -doc.duration - 1 && moment(doc.date, 'YYYY-MM-DD').diff(moment(), "seconds") < 0);
        }
        else {
            var validQuestions = [];
        }

        //Asks user to choose question when more than 1
        if (validQuestions.length > 1) {
            //Embeds options
            const embed = new Discord.MessageEmbed()
                .setColor('#e51f74')
                .setTitle("Which one?")
                .setThumbnail("https://media.discordapp.net/attachments/800827141037883418/803017579601330236/Logo.png?width=427&height=427")
                .setDescription("Hmm... It seems that there is more than one question for today! Which one do you prefer?")
                .setTimestamp()
                .addField("Questions:", "Fill")
                .setFooter('We start with 0 because we are computer scientists');

            //Adds possible options to embed
            const digits = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
            for (let i = 0; i < validQuestions.length; i++) {
                if (i > 9) {
                    break;
                }
                else if (i == 0) {
                    embed.fields[0].value = `${digits[i]} ${validQuestions[i].name}`;
                }
                else {
                    embed.fields[0].value = (`${embed.fields[0].value}\n${digits[i]} ${validQuestions[i].name}`);
                }
            }

            //Send embed
            message.channel.send(embed).then(sentEmbed => {
                //Creates buttons for valid options
                const choices = [];
                for (let i = 0; i < validQuestions.length; i++) {
                    if (i > 9) {
                        break;
                    }
                    sentEmbed.react(digits[i]);
                    choices.push(digits[i]);
                }
                const filter = (reaction, user) => {
                    return choices.includes(reaction.emoji.name) && user.id === message.author.id;
                };

                //Awaits response from user
                sentEmbed.awaitReactions(filter, { max: 1, time: 600000, errors: ['time'] })
                    .then(collected => {
                        //Retrieves first response
                        const reaction = collected.first();
                        //Parses use choice
                        const question = validQuestions[choices.indexOf(reaction.emoji.name)];
                        //Embeds question content
                        const embed = new Discord.MessageEmbed()
                            .setColor('#e51f74')
                            .setTitle(question.name)
                            .setAuthor(`Question By ${question.author}`)
                            .setDescription(`${question.description}`)
                            .setTimestamp()
                            .setFooter('Answer with "-answer <your code snippet here>\n');

                        if (question.demo) embed.addField('-------------------------\n\nDemo', `${question.demo}`);
                        if (question.snippet) embed.addField('-------------------------\n\nCode Snippet', `\`\`\`javascript\n${question.snippet}\n\`\`\``);
                        if (question.source) embed.setAuthor(`Question From ${question.author} | Sourced From ${question.source}`)
                        if (question.diagram) embed.addField('-------------------------\n\nDiagram', 'Here is an visual aid for the problem').setImage('https://static1.squarespace.com/static/5e8d53b5cb496d1636d3b917/t/5fcf064ccd9a2056ff6d6a7b/1607403089372/kurius.png?format=1500w');
                        //Changes option embed to question selected
                        sentEmbed.edit(embed);
                        //Removes all user options
                        sentEmbed.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                    })
                    .catch(() => {
                        //Times out if no reaction
                        message.channel.send('Timed Out. Please ask again');
                    });
            });
        }
        //Displays question
        else if (validQuestions.length == 1) {
            //Embeds question content
            const question = validQuestions[0];
            const embed = new Discord.MessageEmbed()
                .setColor('#e51f74')
                .setTitle(question.name)
                .setAuthor(`Question By ${question.author}`)
                .setDescription(`${question.description}`)
                .setTimestamp()
                .setFooter('Answer with "-answer <your code snippet here>\n');

            if (question.demo) embed.addField('-------------------------\n\nDemo', `${question.demo}`);
            if (question.snippet) embed.addField('-------------------------\n\nCode Snippet', `\`\`\`javascript\n${question.snippet}\n\`\`\``);
            if (question.source) embed.setAuthor(`Question From ${question.author} | Sourced From ${question.source}`)
            if (question.diagram) embed.addField('-------------------------\n\nDiagram', 'Here is an visual aid for the problem').setImage('https://static1.squarespace.com/static/5e8d53b5cb496d1636d3b917/t/5fcf064ccd9a2056ff6d6a7b/1607403089372/kurius.png?format=1500w');

            //Sends question
            message.channel.send(embed);
        }
        else {
            //Apology for no questions
            const embed = new Discord.MessageEmbed()
                .setColor('#e51f74')
                .setTitle("Sorry, No questions have been prepared for now...")
                .setDescription("Come back for more later,\nSee you then!")
                .setThumbnail("https://media.discordapp.net/attachments/800827141037883418/803017579601330236/Logo.png?width=427&height=427")
                .setTimestamp()

            //Fetches upcoming questions
            const upcomingquestions = allquestions
                .filter(doc => moment(doc.date, 'YYYY-MM-DD').diff(moment(), "seconds") > 0)

            if (upcomingquestions.length != 0) {
                //Fetches nearest question
                var nearestquestion = upcomingquestions[0];
                upcomingquestions
                    .forEach(doc => {
                        if (moment(doc.date, 'YYYY-MM-DD').diff(moment(), "days") < moment(nearestquestion.date, 'YYYY-MM-DD').diff(moment(), "days")) {
                            nearestquestion = doc;
                        }
                    })
                //Asks user to come back on that day
                embed.setDescription(`The next question is scheduled to be on ${moment(nearestquestion.date, 'YYYY-MM-DD').format('MMM DD, YYYY')},\nSee you then!`)
            }

            //Sends apology
            message.channel.send(embed);
        }
        //Cleans up user command
        message.delete({ timeout: 0, reason: 'Command cleanup' });
    }
});

