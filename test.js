let amazon = require('amazon-product-api');

//app conf
const fs = require('fs');
const content = fs.readFileSync('./private/conf.json');
const conf = JSON.parse(content);


let client = amazon.createClient({
	awsId: conf.aws.accessKey,
	awsSecret: conf.aws.secret
});

client.itemSearch({
	keywords: "Horizon : Zero Dawn"
}).then(function(results){
	console.log('then');
	console.log(results[0].ItemAttributes);
}).catch(function(err){
	console.log('catch');
	console.log(err);
	console.log((err.Error ? err.Error : err[0].Error));
});

client.itemLookup({
	idType: 'EAN',
	itemId: '0711719503484'
}).then(function(results){
	console.log('then');
	console.log(results[0].ItemAttributes);
}).catch(function(err){
	console.log('catch');
	console.log(err);
	console.log((err.Error ? err.Error : err[0].Error));
});