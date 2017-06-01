let express = require('express');
let router = express.Router();
let bcrypt = require('bcrypt');
let nodeMailer = require('nodemailer');
let id = require('mongoose').Types.ObjectId;

//middleware
const needConnection = require('../private/script/need-connection');

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

module.exports = (app, UsersModel, ProductsModel)=>{
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
	
	let cancelFriendshipDemand = (userId, friendId)=>{
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
					    return friend.user.equals(id(friendId)) && friend.state === 'WAITING'
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
			.catch((err)=>{
				next(err);
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
					        product: user.product,
					        firsrname: user.firsrname,
					        lastname: user.lastname
				        }
			        })
                }
                
                return res.status(404).json({
                    error: true,
                    errorInfos: "NOT FOUND"
                })
			})
			.catch((err)=>{
				next(err);
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
					
					    let message = {
						    sender: '"LibrarizeMe" <librarizeme@no-reply.com>',
						    from: 'librarizeme@no-reply.com',
						    to: userInfos.email,
						    subject: 'Confirmation of your mail',
						    text: "Please click on the link below to confirm your mail address\n" +
                            conf.app.host+"/email/confirm/"+userInfos._id,
						    html: '<p>Please click on the link below to confirm your mail address<br>' +
                            '<a href="'+conf.app.host+"/email/confirm/"+userInfos._id+'>'+conf.app.host+"/email/confirm/"+userInfos._id+'</a> </p>'
					    };
					    
					    //!\ TODO : remettre l'envoie de mail, genant pour le dev et les tests
					    
					    /*transport.sendMail(message,(err)=>{
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
						        res.status(201).json({
							        error: false,
							        user: newUser
						        })
                            }
                        });*/
					    res.status(201).json({
						    error: false,
						    user: newUser
					    })
				    })
				    .catch((err)=>{
					    console.log(err);
					    next(err);
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
				
				console.log(isWaiting);
				
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
	
	router.post('/connection',)
	
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
	
	/**
	 * delete/ refuse friendship
 	 */
	router.delete(':id/friends/:id_friend',(req, res, next)=>{
	    //TODO
		
	});
	
	return router;
};

