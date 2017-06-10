let express = require('express');
let router = express.Router();
let bcrypt = require('bcrypt');
let nodeMailer = require('nodemailer');
let id = require('mongoose').Types.ObjectId;

//middleware to reject non-connect user
const needConnection = require('../private/script/need-connection');
const needToBeOwner = require('../private/script/needToBeOwner');

//app conf
const fs = require('fs');
const content = fs.readFileSync('./private/conf.json');
const conf = JSON.parse(content);

let transport = nodeMailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true, // use SSL
	auth: {
		user: conf.mail.user,
		pass: conf.mail.pass
	}
});

module.exports = (app, UsersModel, ProductsModel, passport)=>{
	"use strict";
	
	
	/**
     * fonction ajout dans la bdd
     *
	 * @param userInfos
	 * @returns {Promise}
	 */
	let createUser = (userInfos)=>{
		return new Promise((resolve, reject)=>{
			UsersModel.create(userInfos)
				.then((elem)=>{
					resolve(elem);
				})
				.catch((err)=>{
					console.log(err);
					reject(err);
				})
		})
	};
	
	/**
	 * get userId's friends [by filter restriction]
	 * @STRING|#Mongoose.Types.ObjectID userId
	 * @STRING['WAITING','VALIDATE] [filter]
	 * @returns {Promise}
	 */
	let getUserFriends = (userId, filter)=>{
		return new Promise((resolve, reject)=>{
		    UsersModel.findById(userId)
			    .then((user)=>{
		    	    if(!user.friends)
		    	    	return resolve([]);
		    	    
		    	    let extendFriends = user.friends.map((friend)=>{
				        console.log(filter, filter =! undefined? friend.state === filter : false);
		    	    	if(filter? friend.state === filter : false){
					        return id(friend.user);
				        }else if(filter === undefined ){
					        console.log('!filter');
				        }
		    	    });
		    	    
		    	    
		    	    
			        UsersModel.find(
			        	{ "_id":
					        {
				                $in: extendFriends
			                }
			            }
			        )
				        .then((friends)=>{
			        	    return resolve(friends);
				        })
				        .catch((err)=>{
			        	    return reject(err);
				        })
			    })
			    .catch((err)=>{
			        return reject(err);
			    })
		})
	};
	
	let delUserFromWaitingList = (userId, askerId)=>{
		return new Promise((resolve, reject)=>{
			if(!userId || !askerId){
				return reject({
					error: true,
					errorInfos: "userId && askerId MUST BE DEFINE"
				})
			}
			UsersModel.findById(userId)
				.then((user)=> {
					if (user.waitingList.indexOf(id(askerId)) < 0){
						return reject({
							error: true,
							errorInfos: "USER NOT IN WAITING LIST"
						});
					}
					
					user.waitingList.splice(user.waitingList.indexOf(id(askerId)),1);
					user.save()
						.then((user)=>{
							return resolve(user);
						})
						.catch((err)=>{
							return reject(err);
						});
				})
				.catch((err)=>{
					return reject(err);
				})
		})
	};
	
	let deleteFriendship = (userId, friendId)=>{
		return new Promise((resolve, reject)=>{
			if(!userId || !friendId){
				return reject({
					error: true,
					errorInfos: "userId && friendId MUST BE DEFINE"
				})
			}
			UsersModel.findById(userId)
				.then((user)=>{
					let index = user.friends.findIndex((friend)=>{
					    return friend.user.equals(id(friendId))
					});
					user.friends.splice(index,1);
					user.save()
						.then((user)=>{
						    return resolve(user);
						})
						.catch((err)=>{
						    return reject(err);
						});
				})
				.catch((err)=>{
					return reject(err);
				})
		})
	};
	
	let generateToken = ()=>{
		let stringLength = 20;
		
		// list containing characters for the random string
		let stringArray = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
		
		let token = "";
		
		// build a string with random characters
		for (let i = 1; i < stringLength; i++) {
			let rndNum = Math.ceil(Math.random() * stringArray.length) - 1;
			token = token + stringArray[rndNum];
		}
		return token;
	};
	//=========GET==========//
	/**
	 * Get users list by pack of 20
	 * params [?offset]
	 */
	router.get('/',(req, res, next)=>{
		UsersModel.find()
			.skip(req.query.offset ? req.params.offset : 0)
			.limit(20)
			.then((users)=>{
				res.status(200).json({
					error: false,
					users: users.map((user)=>{
						return {
							id: user._id,
							pseudo: user.pseudo
						}
					})
				});
			})
			.catch((err)=>{return res.status(500).json({
				error: true,
				errorInfos: err
			})
			})
	});
	
	router.get('/search', (req, res, next)=>{
		let filter = {};
		
		filter['$or'] = [];
		let keywordKey = [
			'pseudo',
			'firstname',
			'lastname',
			'email'
		];
		
		keywordKey.forEach((key)=>{
			let o ={};
			o[key] = {
				$regex: new RegExp('.*('+ req.query.keywords.split(',').join('|') +').*', "i")
			};
			filter.$or.push(o);
		});
		
		UsersModel.find(filter)
			.limit(20)
			.skip(req.query.offset? req.query.offset * 20: 0)
			.then((users)=>{
				return res.status(200).json({
					error: false,
					users: users
				})
			})
			.catch((err)=>{
				return res.status(500).json({
					error: true,
					errorInfos: err
				})
			})
	});
	
	/**
     * Get user by id
	 */
	router.get('/:id',(req, res, next)=>{
		UsersModel.findById(req.params.id)
			.then((user)=>{
		        if(user){
			        return res.status(200).json({
				        error: false,
				        user: {
					        id: user._id,
					        pseudo: user.pseudo,
					        email: user.email,
					        products: user.products,
					        firstname: user.firstname,
					        friends: user.friends,
					        lastname: user.lastname,
					        emprunts: user.emprunts
				        }
			        })
                }
                
                return res.status(404).json({
                    error: true,
                    errorInfos: "NOT FOUND"
                })
			})
			.catch((err)=>{
				return res.status(500).json({
					error: true,
					errorInfos: err
				})
			})
	});
	
	/**
	 * Get user by id
	 */
	router.get('/:id/products',(req, res, next)=>{
		UsersModel.findById(req.params.id)
			.then((user)=>{
				if(user){
					ProductsModel.find({
						id: {
							$in: [
								user.products
							]
						}
					})
						.then((products)=>{
							return res.status(200).json({
								error: false,
								products: products
							});
						})
				}
				
				return res.status(404).json({
					error: true,
					errorInfos: "USER NOT FOUND"
				})
			})
			.catch((err)=>{
				return res.status(500).json({
					error: true,
					errorInfos: err
				})
			})
	});
	
	/**
	 * Get friend of :id user
	 */
	router.get('/:id/friends',(req, res, next)=>{
		UsersModel.findById(req.params.id)
			.then((user)=>{
				if(user){
					UsersModel.find({
						id: {
							$in: user.friends
						}
					})
						.then((friends)=>{
							return res.status(200).json({
								error: false,
								friends: friends
							})
						})
						.catch((err)=>{
						    return res.status(500).json({
							    error: true,
							    errorInfos: err
						    })
						})
					
				}else {
					return res.status(404).json({
						error: true,
						errorInfos: "NOT FOUND"
					})
				}
			})
			.catch((err)=>{
				next(err);
			})
	});
	
	router.get('/:id/confirm/:token', (req, res, next) => {
		UsersModel.findById(req.params.id)
			.then((user) => {
				if(user) {
					bcrypt.compare(req.params.token, user.mailToken)
						.then(() => {
							user.asBeenVerified = true;
							user.save()
								.then((user) => {
									return res.status(200).json({
										error: false
									})
								})
								.catch((err) => {
									return res.status(500).json({
										error: true,
										errorInfos: err
									})
								})
						})
						.catch((err) => {
							return res.status(409).json({
								error: true,
								errorInfos: "NOT AUTHORISED"
							})
						})
				}else{
					return res.status(404).json({
						error: true,
						errorInfos: "NOT FOUND"
					})
				}
			})
			.catch((err) => {
				return res.status(500).json({
					error: true,
					errorInfos: err
				})
			})
	});


	//=========POST==========//
	/**
     * add user to db with verification mail
     * params pseudo, mail, password, verifyMail, verifyPassword
	 */
	router.post('/',(req, res, next)=>{
		let userInfos = {
			pseudo : req.body.pseudo,
			email : req.body.email,
			password : req.body.password,
		};
		let verifyMail = req.body.verifyEmail;
		let verifyPassword = req.body.verifyPassword;
		
		if(!userInfos.pseudo || !userInfos.email || userInfos.email !== verifyMail || !userInfos.password || userInfos.password !== verifyPassword){
			return res.status(401).json({
				error: true,
				errorInfos: "INVALID INFORMATION"
			})
		}
		
		bcrypt.genSalt((err, salt)=>{
		    if(err){
			    console.log(err);
			    return res.status(500).json({
				    error: true,
				    errorInfos: "ERROR SERVER"
			    })
            }
            
		    bcrypt.hash(userInfos.password, salt, (err, hash)=>{
		        userInfos.password = hash;
			    createUser(userInfos)
				    .then((newUser)=>{

						let token = generateToken();

						let id = newUser._id;

						let message = {
							sender: '"LibrarizeMe" <librarizeme@no-reply.com>',
							from: 'librarizeme@no-reply.com',
							to: userInfos.email,
							subject: 'Confirmation of your mail',
							text: "Please click on the link below to confirm your mail address\n" +
							conf.app.host+"/users/"+id+"/confirm/"+token,
							html: '<p>Please click on the link below to confirm your mail address<br>' +
							'<a href="http://'+conf.app.host+"/users/"+id+"/confirm/"+token+'">'+conf.app.host+"/users/"+id+"/confirm/"+token+'</a> </p>'
						};

						console.log("GONNA SEND!");
						//!\ TODO : remettre l'envoie de mail, genant pour le dev et les tests

						transport.sendMail(message,(err)=>{
							console.log(err);
							if(err){
								UsersModel.remove({_id: newUser._id})
									.then(()=>{
										return res.status(500).json({
											error: true,
											errorInfos: "ERROR SEVER"
										})
									})
									.catch((err)=>{
										console.log(err);
										return res.json({err: err})
									})
							}else{
								newUser.mailToken = token;
								newUser.save()
									.then((user) => {
										res.status(201).json({
											error: false,
											user: user
										})
									})
									.catch((err) => {
										return res.status(500).json({
											error: true,
											errorInfos: err
										});
									});
							}

						});
				    })

            })
        });
	});
	
	/**
	 * Ask for friend / validating friendship demand
	 */
	router.post('/:id/friends/:id_friend',(req, res, next)=>{
		UsersModel.find({
			_id: {
				$in: [
					id(req.params.id),
					id(req.params.id_friend)
				]
			}
		})
			.then((users)=>{
				let user = users.filter((user)=>{
				    return user._id.equals(id(req.params.id))
				})[0];
				let friend = users.filter((user)=>{
					return user._id.equals(id(req.params.id_friend))
				})[0];
				
				if(!user || !friend){
					return res.status(404).json({
						error: true,
						errorInfos: "NOT FOUND"
					})
				}
				let exist = user.friends.find((friend)=>{
					return friend.user.equals(id(req.params.id_friend))
				});
				
				if(exist){
					return res.status(409).json({
						error: true,
						errorInfos: "ALREADY EXIST"
					})
				}
				
				let isWaiting = user.waitingList.indexOf(friend._id) > -1;

				
				if(isWaiting){
					//validation of a friendship demand
					delUserFromWaitingList(user._id, friend._id)
						.then((user)=>{
							user.friends.push({
								user: req.params.id_friend,
								state: UsersModel.stateFriend.VALIDATE
							});
						    let friendProjection = friend.friends.find((elem)=>{
						        return elem.user.equals(user._id);
						    });
							friendProjection.state = UsersModel.stateFriend.VALIDATE;
							friend.save()
								.then((friend)=>{
									user.save()
										.then((user)=>{
											return res.status(200).json({
												error: false
											})
										})
										.catch((err)=>{
										    throw err;
										})
								})
						})
						.catch((err)=>{
							return res.status(500).json({
								error: true,
								errorInfos: err.errorInfos ? err.errorInfos : err
							})
						})
				}else{
					//make a friendship demand
					user.friends.push({
						user: friend._id,
						state: 'WAITING'
					});
					user.save()
						.then((user)=>{
							friend.waitingList.push(user._id);
							friend.save()
								.then((friend)=>{
									return res.status(200).json({
										error: false
									})
								})
								.catch((err)=>{
									return res.status(500).json({
										error: true,
										errorInfos: err.message
									})
								})
						})
						.catch((err)=>{
							return res.status(500).json({
								error: true,
								errorInfos: err.message
							})
						})
				}
			})
	});
	
	/**
	 * Ask for a product
	 */
	router.post('/:id/friends/:id_friend/products/:id_product',(req, res, next)=>{
		UsersModel.find({
			_id: {
				$in: [
					id(req.params.id),
					id(req.params.id_friend)
				]
			}
		})
			.then((users)=>{
				let user = users.filter((user)=>{
					return user._id.equals(id(req.params.id))
				})[0];
				let friend = users.filter((user)=>{
					return user._id.equals(id(req.params.id_friend))
				})[0];
				
				if(!user || !friend){
					return res.status(404).json({
						error: true,
						errorInfos: "USER NOT FOUND"
					})
				}
				let exist = user.emprunts.find((emprunt)=>{
					console.log(emprunt);
					if(emprunt.owner.equals(req.params.id_friend)
						&& emprunt.product.equals(id(req.params.id_product))
						&& emprunt.state !== 'RESTITUTE'){
						return true;
					}
				});
				
				if(exist){
					return res.status(409).json({
						error: true,
						errorInfos: "ALREADY EXIST"
					})
				}
				
				let friendAsProduct = friend.products.find((product)=>{
				    return product.equals(req.params.id_product);
				});
				
				if(!friendAsProduct){
					return res.status(403).json({
						error: true,
						errorInfos: "PRODUCT NOT AVAILABLE"
					})
				}
				
				ProductsModel.findById(req.params.id_product)
					.then((product)=>{
					    if(product){
						    user.emprunts.push({
							    owner: friend._id,
							    product: product._id,
							    state: 'WAITING'
						    });
						    user.save()
							    .then((user)=>{
							        friend.emprunts.push({
								        friend: user._id,
								        product: product._id,
								        state: 'WAITING'
							        })
								    friend.save()
									    .then((friend)=>{
									        res.status(200).json({
										        error: false
									        });
									    })
									    .catch((err)=>{
										    return res.status(500).json({
											    error: true,
											    errorInfos: err.message
										    })
									    })
							    })
							    .catch((err)=>{
								    return res.status(500).json({
									    error: true,
									    errorInfos: err.message
								    })
							    })
					    }else{
						    return res.status(404).json({
							    error: true,
							    errorInfos: "PRODUCT NOT FOUND"
						    })
					    }
					})
				
			})
	});
	
	router.post('/:id/products/:id_product',(req, res, next)=>{
	    UsersModel.findById(req.params.id)
		    .then((user)=>{
		        if(user){
		        	ProductsModel.findById(req.params.id_product)
				        .then((product)=>{
				            if(product){
				            	user.products.push(product._id);
				            	user.save()
						            .then((user)=>{
						                res.status(200).json({
							                error: false
						                })
						            })
				            }else{
					            return res.status(404).json({
						            error: true,
						            errorInfos: "PRODUCT NOT FOUND"
					            })
				            }
				        })
		        }else{
			        return res.status(404).json({
				        error: true,
				        errorInfos: "USER NOT FOUND"
			        })
		        }
		    })
	});
	
	router.post('/connection',passport.authenticate('local'), (req, res, next) => {
		res.json(req.user);
	});
	
	//=========PUT==========//
	
	router.put('/:id',(req, res, next)=>{
		let userInfos = {
			pseudo : req.body.pseudo,
			email : req.body.email,
			password : req.body.password,
		};
		let verifyMail = req.body.verifyEmail;
		let verifyPassword = req.body.verifyPassword;
		
		if((userInfos.email ? userInfos.email !== verifyMail : false) || (userInfos.password ? userInfos.password !== verifyPassword : false)){
			return res.status(401).json({
				error: true,
				errorInfos: "INVALID INFORMATION"
			})
		}
		
		new Promise((resolve, reject)=>{
		    if(!userInfos.password){
		        return resolve(undefined);
            }
			bcrypt.genSalt((err, salt)=>{
				if(err){
				    return reject({
					    error: true,
					    errorInfos: "ERROR SERVER"
				    });
				}
				
				bcrypt.hash(userInfos.password, salt, (err, hash)=>{
					if(err){
						return reject({
							error: true,
							errorInfos: "ERROR SERVER"
						});
					}
					
					return resolve(hash);
				});
			});
        }).then((hash)=>{
		    if(hash)
		        userInfos.password = hash;
		    else
		        delete userInfos.password;
		    
		    UsersModel.findById(req.params.id)
                .then((user)=>{
		            if(user) {
			            for (let key in userInfos) {
				            user[key] = userInfos[key];
			            }
			
			            user.save()
				            .then((user) => {
					            return res.status(200).json({
                                    error: false
                                })
				            })
				            .catch((err) => {
								return res.status(500).json({
									error: true,
									errorInfos: err
								})
				            });
		            }else{
		                return res.status(404).json({
                            error: true,
                            errorInfos: "NOT FOUND"
                        })
                    }
                    
                })
                .catch((err)=>{
	                return res.status(500).json({
		                error: true,
		                errorInfos: err
	                })
                })
            
        })
			
		
	});
	
	router.put('/:id/emprunts/:id_emprunt', (req, res, next)=>{
		if (!req.body.state
			|| (req.body.state !== UsersModel.stateEmprunt.VALIDATE
			&& req.body.state !== UsersModel.stateEmprunt.RESTITUTE
			&& req.body.state !== UsersModel.stateEmprunt.REFUSED)){
			return res.status(403).json({
				error: true,
				errorInfos: "INCORRECT STATE"
			})
		}
	    UsersModel.findById(req.params.id)
		    .then((user)=>{
		        if(user){
			        console.log('test');
		            let index = user.emprunts.findIndex((emprunt)=>{
			            console.log(emprunt._id, req.params.id_emprunt);
		                return id(emprunt._id).equals(id(req.params.id_emprunt));
		            });
			
			        console.log(index);
		         
			        if(index < 0){
				        return res.status(404).json({
					        error: true,
					        errorInfos: "NOT FOUND"
				        })
			        }
			        
			        user.emprunts[index].state = req.body.state;
			
			        user.save()
				        .then((user)=>{
					        console.log('then user');
					        let friend = user.emprunts[index].friend ? user.emprunts[index].friend : user.emprunts[index].owner;
					
					        UsersModel.findById(friend)
						        .then((result)=>{
							        console.log('then friend');
							        let indexFriend = result.emprunts.findIndex((emprunt)=>{
								        console.log('test');
								        let owner = user.emprunts[index].friend ? false : true;
								        console.log(owner);
								        if(owner){
									        return emprunt.friend.equals(user._id) && emprunt.product.equals(id(req.params.id_product)) && emprunt.state !== UsersModel.stateEmprunt.RESTITUTE || emprunt.state !== UsersModel.stateEmprunt.REFUSED
								        }else{
									        return emprunt.owner.equals(user._id) && emprunt.product.equals(id(req.params.id_product)) && emprunt.state !== UsersModel.stateEmprunt.RESTITUTE || emprunt.state !== UsersModel.stateEmprunt.REFUSED
								        }
							        });
							
							        console.log('index :'+indexFriend);
							        
							        result.emprunts[indexFriend].state = req.body.state;
							
							        console.log('test');
							        
							        result.save()
								        .then((friend)=>{
									        console.log('then friend')
								            res.status(200).json({
									            error: false
								            })
								        })
								        .catch((err)=>{
									        return res.status(500).json({
										        error: true,
										        errorInfos: err
									        });
								        })
						        })
						        .catch((err)=>{
							        return res.status(500).json({
								        error: true,
								        errorInfos: err
							        })
						        })
				        })
			        
		        }else{
			        return res.status(404).json({
				        error: true,
				        errorInfos: "USER NOT FOUND"
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

	//=========DELETE==========//

	/**
	 * delete/ refuse friendship
 	 */
	router.delete('/:id/friends/:id_friend',(req, res, next)=>{
		UsersModel.find({
			_id: {
				$in: [
					id(req.params.id),
					id(req.params.id_friend)
				]
			}
		})
			.then((users)=> {
				let user = users.filter((user) => {
					return user._id.equals(id(req.params.id))
				})[0];
				let friend = users.filter((user) => {
					return user._id.equals(id(req.params.id_friend))
				})[0];

				if (!user || !friend) {
					return res.status(404).json({
						error: true,
						errorInfos: "NOT FOUND"
					})
				}
				let inFriendList = user.friends.find((friend) => {
					return friend.user.equals(id(req.params.id_friend))
				});

				let inUserWaitingList = user.waitingList.find((friendID) => {
					return id(friendID).equals(id(req.params.id_friend))
				});

				if (!inFriendList && !inUserWaitingList) {
					return res.status(409).json({
						error: true,
						errorInfos: "INVALID INFORMATION"
					})
				}

				if(inFriendList) {
					console.log("inFriendList");
					deleteFriendship(user._id, friend._id)
						.then((user) => {
							let isInWaitingList = false;
							if (friend.waitingList.length > 0) {
								isInWaitingList = friend.waitingList.find((asker) => {
									return id(asker).equals(id(req.params.id));
								});
							}
							if (isInWaitingList) {
								console.log("inWAITINGFriendList");
								delUserFromWaitingList(friend._id, user._id)
									.then((friend) => {
										return res.status(200).json({
											error: false
										});
									})
									.catch((err) => {
										throw err;
									})
							} else {
								console.log("NOTinWAITINGFriendList");
								deleteFriendship(friend._id, user._id)
									.then((friend) => {
										return res.status(200).json({
											error: false
										})
									})
									.catch((err) => {
										throw err;
									})
							}
						})
						.catch((err) => {
							throw err;
						})
				}else{
					console.log("NOT inFriendList");
					delUserFromWaitingList(user._id,friend._id)
						.then((user) => {
							let inFriendFriendList = friend.friends.find((friend) => {
								return friend.user.equals(id(req.params.id))
							});
							if(inFriendFriendList) {
								console.log("inFriendFriendList");
								deleteFriendship(friend._id, user._id)
									.then((friend) => {
										return res.status(200).json({
											error: false
										})
									})
									.catch((err) => {
										return res.status(500).json({
											error: true,
											errorInfos: err
										});
									})
							}else{
								console.log("NOT inFriendFriendList");
								return res.status(409).json({
									error: true,
									errorInfos: "INVALID INFORMATION"
								});
							}
						})
						.catch((err) => {
							throw err;
						})
				}
			})
			.catch((err) => {
				res.status(500).json({
					error: true,
					errorInfos: err
				})
			})
	});
	
	router.delete('/:id/products/:id_product',(req, res, next)=>{
		UsersModel.findById(req.params.id)
			.then((user)=>{
				if(user){
					let index = user.products.findIndex((object)=>{
					    return object.equals(id(req.params.id_product));
					});
					if(index < 0){
						return res.status(403).json({
							error: true,
							errorInfos: "PRODUCT NOT FOUND"
						})
					}
					
					user.products.splice(index,1);
					user.save()
						.then((user)=>{
						    return res.status(200).json({
							    error: false
						    })
						})
						.catch((err)=>{
						    return res.status(500).json({
							    error: true,
							    errorInfos: err
						    })
						})
				}else{
					return res.status(404).json({
						error: true,
						errorInfos: "USER NOT FOUND"
					})
				}
			})
	});

	router.delete('/connection', (req, res, next) => {
		req.logOut();
		res.status(200).send();
	});
	
	return router;
};

