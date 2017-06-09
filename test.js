let amazon = require('amazon-product-api');

//app conf
const fs = require('fs');
const content = fs.readFileSync('./private/conf.json');
const conf = JSON.parse(content);


let client = amazon.createClient({
	awsId: conf.aws.accessKey,
	awsSecret: conf.aws.secret
});

client.itemLookup({
	idType: 'ISBN',
	itemId: '978-0747595823'
}).then(function(results){
	console.log('then');
	console.log(results);
}).catch(function(err){
	console.log('catch');
	console.log(err[0].Error);
});