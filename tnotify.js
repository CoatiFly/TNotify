angular.module('TNotify', [])
  .directive('tNotify', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: true,
      template: '<div class="tnotify-overlay">' +
                  '<div class="tnotify">' +
                    '<div class="tnotify-inner" ng-class="{remind: type === \'remind\'}">' +
                      '<div class="tnotify-title" ng-if="title">{{ title }}</div>' +
                      '<div class="tnotify-text" ng-if="text">{{ text }}</div>' +
                      '<input type="{{ inputType }}" placeholder="{{ inputPlaceHolder }}" class="tnotify-text-input" ng-if="type === \'prompt\'" ng-model="form.input">' +
                    '</div>' +
                    '<div class="tnotify-buttons" ng-if="type !== \'remind\'">' +
                      '<span class="tnotify-button" ng-if="type !== \'alert\'" ng-click="onCancel()">{{ cancelText }}</span>' +
                      '<span class="tnotify-button tnotify-button-bold" ng-click="onOk(input)">{{ okText }}</span>' +
                    '</div>' +
                  '</div>' +
                '</div>'
    };
  })
  .factory('transition', ['$window', function($window){
    var transElement = $window.document.createElement("div");
    var transitionEndEventNames = {
      'WebkitTransition': 'webkitTransitionEnd',
      'MozTransition': 'transitionend',
      'OTransition': 'oTransitionEnd',
      'transition': 'transitionend'
    };
    var animationEndEventNames = {
      'WebkitTransition': 'webkitAnimationEnd',
      'MozTransition': 'animationend',
      'OTransition': 'oAnimationEnd',
      'transition': 'animationend'
    };
    var findEndEventName = function(endEventNames) {
      for (var name in endEventNames){
        if (transElement.style[name] !== undefined) {
          return endEventNames[name];
        }
      }
    };
    return {
      transitionEndEventName: findEndEventName(transitionEndEventNames),
      animationEndEventName: findEndEventName(animationEndEventNames)
    };
  }])
  .provider('TNotify', function(){
    var base = {
      title: null,
      text: null,
      form: {
        input: ''
      },
      inputType: 'text',
      inputPlaceHolder: '',
      cancelText: '取消',
      okText: '确定'
    };
    var dicts = ['title', 'text', 'cancelText', 'okText', 'inputType', 'inputPlaceHolder'];
    this.set = function(key, value){
      var self = this;
      if(angular.isObject(key)){
        for(var name in key){
          self.set(name, key[name]);
        }
      }else{
        if(key && (dicts.indexOf(key) > -1)){
          if(value){
            base[key] = value;
          }
        }
      }
    };

    this.$get = [
      '$rootScope',
      '$compile',
      '$animate',
      '$q',
      '$document',
      '$timeout',
      'transition',
      function($rootScope, $compile, $animate, $q, $document, $timeout, transition){
        console.log(transition);
        function show(opt){
          var deferred = $q.defer();
          var $scope = $rootScope.$new(true);

          angular.extend($scope, base, opt);

          $scope.onCancel = function(){
            if($scope.type === 'confirm'){
              deferred.resolve(false);
            }else if($scope.type === 'prompt'){
              deferred.resolve(null);
              $scope.form.input = '';
            }
            $scope.$destroy();
          };

          $scope.onOk = function(){
            if($scope.type === 'prompt'){
              deferred.resolve($scope.form.input || '');
              $scope.form.input = '';
            }else{
              deferred.resolve(true);
            }
            $scope.$destroy();
          };

          var $element = $compile('<t-notify></t-notify>')($scope);

          if($scope.type !== 'remind'){
            $animate.enter(
              $element,
              angular.element($document[0].body),
              angular.element($document[0].body.lastChild)
            ).then(function(){
              $element.addClass('tnotify-animate tnotify-in');
              $scope.$on('$destroy', function(){
                $element.on(transition.transitionEndEventName, function(){
                  $element.off(transition.transitionEndEventName).remove();
                });
                $element.addClass('tnotify-out');
              });
            });
          }else{
            $animate.enter(
              $element,
              angular.element($document[0].body),
              angular.element($document[0].body.lastChild)
            ).then(function(){
              var step;
              $element.on(transition.transitionEndEventName, function(){
                if(step === 'out'){
                  $element.off(transition.transitionEndEventName).remove();
                  deferred.resolve();
                }else if(step === 'in'){
                  $timeout(function(){
                    step = 'out';
                    $element.addClass('tnotify-out');
                  }, 150);
                }
              });
              step = 'in';
              $element.addClass('tnotify-animate tnotify-in');
            });
          }

          return deferred.promise;
        }

        function objectify(opt){
          if(angular.isString(opt)){
            return {
              text: opt
            };
          }else if(angular.isObject(opt)){
            return opt;
          }else{
            throw new Error('expect a string or a object');
            return {};
          }
        }

        function alert(opt){
          opt = objectify(opt);
          opt.type = 'alert';
          return show(opt);
        }
        function confirm(opt){
          opt = objectify(opt);
          opt.type = 'confirm';
          return show(opt);
        }
        function prompt(opt){
          opt = objectify(opt);
          opt.type = 'prompt';
          return show(opt);
        }
        function remind(opt){
          opt = objectify(opt);
          if(transition.transitionEndEventName){
            opt.type = 'remind';
          }else{
            opt.type = 'alert';
          }
          return show(opt);
        }
        return {
          alert: alert,
          confirm: confirm,
          prompt: prompt,
          remind: remind
        };
      }
    ];
  });
