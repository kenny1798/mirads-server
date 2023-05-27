module.exports = (sequelize, DataTypes) => {
    const mgenSessions = sequelize.define("mgenSessions", {
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        session_client: {
            type: DataTypes.STRING,
            allowNull: false
        },
        session_status: {
            type: DataTypes.STRING,
            allowNull: false
        },
        form_title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        form_body: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        form_image: {
            type: DataTypes.STRING,
        },
        whatsapp_text: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        isActive:{
            type: DataTypes.BOOLEAN,
            defaultValue: 0,

        },
        lastSubmit:{
            type: DataTypes.DATE,
            defaultValue:0,
        },
        submitQueue:{
            type: DataTypes.INTEGER,
            defaultValue:0,
        }

    })

    return mgenSessions
   };