let express = require('express');
let router = express.Router();
let request = require('request');

//app conf
const fs = require('fs');
const content = fs.readFileSync('./private/conf.json');
const conf = JSON.parse(content);

module.exports = (app, UsersModel, ProductsModel)=>{
	"use strict";
	
	//=========GET==========//
	/**
	 * Get products list by pack of 20
	 * params [?offset]
	 */
	router.get('/',(req, res, next)=>{
		ProductsModel.find()
			.skip(req.query.offset ? req.params.offset : 0)
			.limit(20)
			.then((products)=>{
				res.status(200).json({
					error: false,
					products: products
				});
			})
			.catch((err)=>{
				next(err);
			})
	});
	
	return router;
};
