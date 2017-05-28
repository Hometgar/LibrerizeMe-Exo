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
        googleId: Schema.Types.String,
        facebookId: Schema.Types.String,
        asBeenVerified: {
            type: Boolean,
            default: false
        },
        products: [{
                type: ObjectID,
                ref: "Product"
        }],
        emprunts: [{
            "owner":{
                type: ObjectID,
                ref: "User"
            },
            "product":{
                type: ObjectID,
                ref: "Product"
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

    return User;
};


