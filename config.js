module.exports = {
	port: process.env.PORT || 3000,
	queueTime: process.env.QUEUETIME || 8000,
	slackToken: process.env.SLACK_TOKEN || undefined,
	defaultChannel: process.env.DEFAULT_CHANNEL || '#global',
	mongodb: process.env.MONGODB /*|| 'mongodb://carsten:carsten@carsten.mo.sap.corp:27017/', */|| 'mongodb://carsten:carsten@ds063909.mongolab.com:63909/',
	database: process.env.DATABASE || 'carsten',
	http_proxy: process.env.HTTP_PROXY
};