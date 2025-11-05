/*
 * Connect all of your endpoints together here.
 */
module.exports = function (app, router) {
    const routes = require('./home.js')(router);
    app.use('/api', routes);
    app.use('/', routes); 
};
