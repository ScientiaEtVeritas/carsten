module.exports = {
	port: process.env.PORT || 3000,
	queueTime: process.env.QUEUETIME || 8000,
	slackToken: process.env.SLACK_TOKEN || undefined,
	defaultChannel: process.env.DEFAULT_CHANNEL || '#global'
};