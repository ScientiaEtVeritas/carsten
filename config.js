module.exports = {
	port: process.env.PORT || 3000,
	queueTime: process.env.QUEUETIME || 30000,
	slackToken: process.env.SLACK_TOKEN || undefined,
}