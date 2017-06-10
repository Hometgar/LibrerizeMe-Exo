"use strict"
const Mongoose = require('mongoose');

let Schema = Mongoose.Schema;
let ObjectID = Schema.ObjectId;

module.exports = (app, connection) =>{

    let User = connection.model('User', new Schema({
        id: ObjectID,
        pseudo: {
            type: String,
            unique: true
        },
        firstname: Schema.Types.String,
        lastname: Schema.Types.String,
        email: {
            type: Schema.Types.String,
            unique: true
        },
        password: Schema.Types.String,
        passwordToken: String,
        googleId: Schema.Types.String,
        facebookId: Schema.Types.String,
        asBeenVerified: {
            type: Boolean,
            default: false
        },
        mailToken: Schema.Types.String,
        products: [{
            type: ObjectID,
            ref: "Product"
        }],
        emprunts: [{
            friend:{
	            type: ObjectID,
	            ref: "User"
            },
            owner:{
                type: ObjectID,
                ref: "User"
            },
            product:{
                type: ObjectID,
                ref: "Product"
            },
            state:{
	            type: Schema.Types.String,
	            enum:['VALIDATE', 'WAITING', 'RESTITUTE', 'REFUSED']
            }
        }],
        friends: [{
            user: {
                type: ObjectID,
                ref: "User"
            },
            state: {
                type: Schema.Types.String,
                enum:['VALIDATE', 'WAITING']
            }
        }],
        waitingList: [{
            type: ObjectID,
            ref: "User"
        }]
    }));
    
    User.stateFriend = {
		WAITING : 'WAITING',
		VALIDATE: "VALIDATE"
	};
	
	User.stateEmprunt = {
		WAITING : 'WAITING',
		VALIDATE: "VALIDATE",
		RESTITUTE: "RESTITUTE",
		REFUSED: "REFUSED"
	};

    return User;
};


