"use strict"
const Mongoose = require('mongoose');

let Schema = Mongoose.Schema;
let ObjectID = Schema.ObjectId;

module.exports = (app, connection) =>{
	
	let Products = connection.model('Product', new Schema({
		title: Schema.Types.String,
		type: Schema.Types.String,
		EAN: {
			type: Schema.Types.Number,
			index: true,
			unique: true
		},
		publisher: Schema.Types.String,
		author: [Schema.Types.String],
		release: Schema.Types.String,
		director: [Schema.Types.String],
		actor: [Schema.Types.String],
		platform: [Schema.Types.String],
		artist: [Schema.Types.String],
		ASIN: {
			type: Schema.Types.String,
			index: true,
			unique: true
		}
	}));
	
	return Products;
};


