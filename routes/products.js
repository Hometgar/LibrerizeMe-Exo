let express = require('express');
let router = express.Router();
let amazon = require('amazon-product-api');
let id = require('mongoose').Types.ObjectId;

//app conf
const fs = require('fs');
const content = fs.readFileSync('./private/conf.json');
const conf = JSON.parse(content);

let client = amazon.createClient({
	awsId: conf.aws.accessKey,
	awsSecret: conf.aws.secret
});

module.exports = (app, UsersModel, ProductsModel)=>{
	"use strict";
	
	/**
	 * format an amazon object to a db object format
	 * @param product
	 * @returns format object
	 */
	let formatProduct = (product)=>{
		let result = {};
		
		product.ItemAttributes[0].ASIN = product.ASIN;
		product = product.ItemAttributes[0];
		
		for(let key in product){
			switch (key){
				case 'Actor':
				case 'Author':
				case 'Publisher':
				case 'Director':
				case 'Artist':
				case 'Platform':
					result[key.toLowerCase()] = product[key];
					break;
				case 'EAN':
				case 'ASIN':
				case 'Title':
					result[key == 'Title' ? key.toLowerCase() : key ] = product[key][0];
					break;
				case 'ProductGroup':
					result['type'] = product.ProductGroup[0];
					break;
				case 'ReleaseDate':
					result['release'] = product.ReleaseDate[0];
			}
		}
		
		return result;
	};
	
	/**
	 * format an array of|an amazon objects to an array of| a db object format
	 * @param products|product
	 * @returns format array|object
	 */
	let formatProducts = (products)=>{
		let result = [];
		if (products.length > 0){
			products.forEach((product)=>{
				result.push(formatProduct(product));
			})
		}else{
			result.push(formatProduct(product));
		}
		return result;
	};

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


    /**
     * return filtered products by pack of 20
     * params EAN, keywords, type, offset
     */
    router.get('/search',(req, res, next)=>{
        let filter = {};

        filter['$or'] = [];
        let keywordKey = [
            'title',
            'author',
            'publisher',
            'director',
            'actor',
            'platform',
            'artiste',
        ]
        let value = req.query;

        for (let key in req.query){
            switch (key){
                case 'EAN':
                    filter.EAN = req.query.EAN;
                    break;
                case 'keywords':
                    keywordKey.forEach((key)=>{
                        let o ={};
                        o[key] = {
                            $regex: new RegExp('.*('+ value.keywords.split(',').join('|') +').*', "i")
                        };
                        filter.$or.push(o);
                    })

                    break;
                case 'type':
                    if(req.query.keywords) {
                        filter.$and = [
                            {
                                type : req.query.type
                            },
                            {
                                $or: filter.$or
                            }
                        ]
                    }else{
                        filter.type = req.query.type
                    }
                    delete filter.$or;
                    break;
            }
        }

        ProductsModel.find(filter)
            .limit(20)
            .skip(req.query.offset? req.query.offset * 20: 0)
            .then((products)=>{
                console.log(products);
                if(products.length > 0){
                    res.status(200).json({
                        error: false,
                        products: products
                    })
                }else{
                    if(req.query.EAN){
                        client.itemLookup({
                            idType: 'EAN',
                            itemId: req.query.EAN
                        }).then(function(results){
                            console.log(results);
                            if(results.length > 0) {
                                return res.status(200).json({
                                    error: false,
                                    products: formatProducts(results)
                                });
                            }else {
                                return res.status(404).json({
                                    error: true,
                                    errorInfos: "NOT FOUND"
                                });
                            }
                        }).catch(function(err){
                            return res.status(500).json({
                                error: true,
                                errorInfos: (err.Error ? err.Error : err[0].Error)
                            });
                        });
                    }

                    if(req.query.keywords || req.query.type){
                        return res.status(404).json({
                            error: true,
                            errorInfos: "NOT FOUND"
                        });
                    }
                }
            })
            .catch((err)=>{
                console.log(err);
                return res.status(500).json({
                    error: true,
                    errorInfos: err
                });
            })
    });


    router.get('/:id',(req, res, next)=>{
		ProductsModel.findById(id(req.params.id))
			.then((product)=>{
				res.status(200).json({
					error: false,
					product: product
				});
			})
			.catch((err)=>{
				next(err);
			})
	});

	//=========POST==========//
	/**
	 * add product to db
	 * param title, type, EAN, publisher, author, realease, director, actor, platform, artist, ASIN
	 */
	router.post('/',(req, res, next)=>{
		let productInfos = {};
		
		for (let key in req.body){
			productInfos[key] = req.body[key]
		}

		if(!productInfos.EAN || !productInfos.ASIN){
			return res.status(401).json({
				error: true,
				errorInfos: "INVALID INFORMATION"
			})
		}
		
		ProductsModel.find({EAN: productInfos.EAN})
			.then((object)=>{
			    if(object.length > 0){
				    return res.status(403).json({
					    error: true,
					    errorInfos: "ALREADY EXIST"
				    })
			    }else{
				    ProductsModel.create(productInfos)
					    .then((newProduct)=>{
						    return res.status(201).json({
							    error: false,
							    product: newProduct
						    });
					    })
					    .catch((err)=>{
						    return res.status(500).json({
							    error: true,
							    errorInfos: err
						    });
					    })
			    }
			})
			.catch((err)=>{
				return res.status(500).json({
					error: true,
					errorInfos: err
				});
			})
	});
	
	return router;
};
