angular.module('ngRouting',[])
    .constant('routingUtils',{
        capitalize: function  (string) {
            return string.charAt(0).toUpperCase() + string.slice(1)
        },
        collectionRoute: function (base,model) {
            return (base.path || '')+'/'+model+'s'
        },
        resourceRoute: function (base,model) {
            return this.collectionRoute(base,model)+'/:'+this.modelId(model)
        },
        editResourceRoute: function (base,model) {
            return this.resourceRoute(base,model)+'/edit'
        },
        newResourceRoute: function (base,model) {
            return this.collectionRoute(base,model)+'/new'
        },
        modelId : function (model) {
            return model+'Id'
        }
    })
    .provider('routing',function ($routeProvider,routingUtils,$locationProvider,$logProvider) {
        var functions = { }
            ,capitalize = routingUtils.capitalize
            ,injector = angular.injector(['ng'])
            ,$log     = injector.invoke($logProvider.$get)
        function makeRoute(route, base){
            base = base || {models:[]}
            var routes = {};
                ['collectionRoute',
                 'resourceRoute',
                 'editResourceRoute',
                 'newResourceRoute'].forEach(function (method) {
                        routes[method] = routingUtils[method](base,route.model)
                 })
            var model = route.model
                , Model = capitalize(model)
                , resolve =  route.resolve || provider.resolve
                , collectionRoute = {
                    controller: Model+'ListCtrl'
                    ,resolve: resolve
                    ,templateUrl: 'views/'+model+'/list.html'
                }
                , resourceRoute = {
                    controller: Model+'Ctrl'
                    ,resolve: resolve
                    ,templateUrl: 'views/'+model+'/show.html'
                }
                , newResourceRoute = {
                    controller:'New'+Model+'Ctrl'
                    ,resolve: resolve
                    ,templateUrl: 'views/'+model+'/new.html'
                }
                , editResourceRoute = {
                    controller:'Edit'+Model+'Ctrl'
                    ,resolve: resolve
                    ,templateUrl: 'views/'+model+'/edit.html'
                }
                
            base.models.push(model)
            var path = base.models[0] + base.models.slice(1).map(capitalize).join()
            functions[path + 'sPath'] = {path:routes.collectionRoute , models: base.models}
            functions[path + 'Path']  = {path:routes.resourceRoute   , models: base.models}
            functions['new'+capitalize(path) + 'Path']  = {path:routes.newResourceRoute , models: base.models}
            functions['edit'+capitalize(path) + 'Path'] = {path:routes.editResourceRoute, models: base.models}

            function when (path,route) {
                $routeProvider.when(path,route)
                $log.debug(path,route)
            }

            $logProvider.debugEnabled() && console.group && console.group(model)
            
            when(routes.collectionRoute  ,collectionRoute)
            when(routes.newResourceRoute ,newResourceRoute)
            when(routes.resourceRoute    ,resourceRoute)
            when(routes.editResourceRoute,editResourceRoute)

            if(route.nested){
                angular.forEach(route.nested,function (nested) {
                    base.path = routes.resourceRoute
                    makeRoute(nested,base)
                })
            }
            $logProvider.debugEnabled() && console.groupEnd && console.groupEnd()
        }

        function spreadArguments(fn,models) {
            return function () {
                var scope = {},
                        args = arguments
                models.forEach(function (model,i) {
                    scope[routingUtils.modelId(model)] = angular.isObject(args[i]) ? args[i].id :  args[i]
                })
                return fn(scope)
            }
        }
        
        var provider = {
            pathRe: new RegExp(':([^/]*)','g'),
            build:function (routes) {
                provider.basePath = $locationProvider.html5Mode() ? '' : ('/#' + $locationProvider.hashPrefix()),
                angular.forEach(routes,makeRoute)
                return $routeProvider
            },
            withResolve: function(resolve){
                this.resolve = resolve
                return this
            },
            $get:function ($interpolate, $rootScope) {
                var methods = {}
                Object.keys(functions).forEach(function (method) {
                    var path = provider.basePath + functions[method].path.replace(provider.pathRe,'{{$1}}')
                        ,interpolate = $interpolate(path)
                    methods[method] = spreadArguments(interpolate,functions[method].models)
                })
                return {
                    helpers:methods
                }
            }
        }
        return provider
    })