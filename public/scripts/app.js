angular.module('billingSystemApp', [])
    .controller('MainController', ['$http', '$interval', function($http, $interval){

        let vm = this;
        vm.opportunities = [];

        function loadOpportunities() {
            $http.get('/opportunity').then((response) => {
                console.log('Opportunities', response);

                let _opps = [];
                _.each(response.data, (_event) => {
                    _opps.push(JSON.parse(_event.payload.Payload__c));
                });

                vm.opportunities = _opps;
            });
        }

        let socket = io();
        socket.on('opportunity', function(msg){
            console.log('Opportunity Received: ', msg);
            loadOpportunities();
        });

        vm.reject = function(opp) {

        };

        vm.generateInvoice = function(opp) {
            console.log('Generate Invoice for ', opp);
            $http.post('/invoice', opp).then((response) => {

            })

        };

        loadOpportunities();

    }]);
