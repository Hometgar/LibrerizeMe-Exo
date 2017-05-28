"use strict"
const Mongoose = require('mongoose');

let Schema = Mongoose.Schema;
let ObjectID = Schema.ObjectId;

module.exports = (app, connection) =>{
	
	let Products = connection.model('Product', new Schema({
		label: Schema.Types.String,
		type: Schema.Types.String,
		EAN: {type: Schema.Types.String, primary: true},
		like: Schema.Types.Number,
		vue: Schema.Types.Number,
		genre: Schema.Types.String,
		editeur: Schema.Types.String,
		auteur: [Schema.Types.String],
		sortie: Schema.Types.String,
		realisateur: [Schema.Types.String],
		acteurs: [Schema.Types.String],
		prix: Schema.Types.Number,
		platforme: [Schema.Types.String],
		artiste: [Schema.Types.String]
	}));
	
	return Products;
};


