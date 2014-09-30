var unisheduleApp = angular.module('unisheduleApp');

unisheduleApp.controller('ScheduleCtrl',
    ['$scope', '$rootScope', '$http', '$location', '$routeParams', '$filter', 'APIUrls', 'scheduleType',
        function ($scope, $rootScope, $http, $location, $routeParams, $filter, APIUrls, type) {
            $scope.error = false;
            $scope.title = '';
            $scope.isCurrentWeek = false;

            $location.search(['q', 'kind'], null);

            $scope.prevWeek = function () {
                var prev_start = $scope.start_date.setHours(-7 * 24);

                $location.search('date', $filter('date')(prev_start, 'yyyy-MM-dd'));
            };

            $scope.nextWeek = function () {
                var next_start = $scope.start_date.setHours(7 * 24);

                $location.search('date', $filter('date')(next_start, 'yyyy-MM-dd'));
            };

            $scope.getTime = function() {
                var now = new Date(),
                    start = new Date();

                start.setHours(8);
                start.setMinutes(0);
                start.setSeconds(0);

                return Math.round((now - start) / 60 / 1000);
            };

            switch (type) {
                case 'room':
                    $rootScope.tabLocation = '/buildings';
                    $scope.url = APIUrls.getUrl("roomSchedule", $routeParams.id, $routeParams.room_id, $routeParams.date);
                    $scope.getTitle = function (data) {
                        return 'Расписание аудитории ' + data.room.name;
                    };
                    break;
                case 'teacher':
                    $rootScope.tabLocation = '/teachers';
                    $scope.url = APIUrls.getUrl("teacherSchedule", $routeParams.id, $routeParams.date);
                    $scope.getTitle = function (data) {
                        return data.lecturer.full_name;
                    };
                    break;
                default :
                    $rootScope.tabLocation = '/';
                    $scope.url = APIUrls.getUrl("schedule", $routeParams.id, $routeParams.date);
                    $scope.getTitle = function (data) {
                        return 'Расписание группы ' + data.group.name;
                    };
                    break;
            }

            $scope.schedule = [];
            $scope.days = [
                '', 'Понедельник', 'Вторник', 'Cреда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'
            ];
            $scope.lessonTypes = [
                'Упражнения',
                'Лабораторная',
                'Лекция',
                'Семинар',
                'Консультация',
                'Внеучебное занятие',
                'Зачет',
                'Экзамен'
            ];

            function transformDate(str) {
                // todo: вынести в какой-то внешний сервис
                return $filter('date')(new Date(str), 'dd.MM.yyyy');
            }

            function getWeekType(week) {
                return week.is_odd ? 'нечётная неделя' : 'чётная неделя';
            }

            function isCurrentWeek(week) {
                var startDate = new Date(week.date_start),
                    endDate = new Date(week.date_end),
                    today = new Date();

                return today > startDate && today <= endDate;
            }

            function getDayDate(week, day) {
                return new Date(week.date_start).setHours((day - 1) * 24);
            }

            $scope.checkDoubles = function (e) {
                var elem = angular.element(e.currentTarget),
                    lessons = elem.parent()[0],
                    lessonId,
                    doubles;

                lessonId = elem.attr('class').split(' ').reduce(function (prev, cur) {
                    if (cur.indexOf('lesson_start_') !== -1) {
                        return cur;
                    } else {
                        return prev;
                    }
                }, '');

                doubles = lessons.querySelectorAll('.' + lessonId);

                if (doubles.length === 1) {
                    return;
                }

                angular.forEach(doubles, function (elem) {
                    angular.element(elem).toggleClass('lesson_double');
                });
            };

            $http
                .get($scope.url)
                .success(function (data) {
                    var highlightToday,
                        todaysDay = new Date().getDay();

                    if (data.error) {
                        $scope.start_date = $location.search().date ?
                            new Date($location.search().date) : new Date();

                        $rootScope.subtitle = '';
                        $scope.error = true;
                        $scope.errorMessage = data.text;
                        return;
                    }


                    $scope.start_date = new Date(data.week.date_start);

                    $scope.error = false;
                    highlightToday = isCurrentWeek(data.week);
                    $scope.isEmpty = data.days.length === 0;
                    $scope.schedule = data.days
                        .map(function (day) {
                            var lessonsStartTimes = [];

                            day.lessons.forEach(function (lesson) {
                                lesson.startPosition = (lesson.time_start.split(":")[0] - 7);
                                lesson.duration = lesson.time_end.split(":")[0] - lesson.time_start.split(":")[0] + 1;
                                lesson.className = 'lesson_start_' + lesson.startPosition;
                                lesson.className += ' lesson_duration_' + lesson.duration;
                                if (lessonsStartTimes.indexOf(lesson.time_start) != -1) {
                                    lesson.className += ' lesson_double';
                                }
                                lessonsStartTimes.push(lesson.time_start);
                            });

                            day.today = (highlightToday && todaysDay === day.weekday % 7) ?
                                'yes' : 'no';

                            return day;
                        })
                        .sort(function (cur, prev) {
                            return cur.weekday - prev.weekday;
                        });

                    for (var i = 1; i < 7; i++) {
                        if (!$scope.schedule[i - 1]) {
                            $scope.schedule.push({weekday: i, lessons: [], today: (highlightToday && todaysDay === i) ?
                                'yes' : 'no'});
                        }
                        if ($scope.schedule[i - 1].weekday !== i) {
                            $scope.schedule.splice(i - 1, 0, {weekday: i, lessons: [], today: (highlightToday && todaysDay === i) ?
                                'yes' : 'no'});
                        }
                    }

                    $scope.schedule.forEach(function (day) {
                        day.date = getDayDate(data.week, day.weekday);
                    });

                    $scope.title = $scope.getTitle(data) +
                        ', ' + getWeekType(data.week);
                    $scope.colWidth = Math.ceil((1 / $scope.schedule.length) * 100);

                    $scope.isCurrentWeek = highlightToday;

                    $scope.time = $scope.getTime();
                })
                .error(function() {
                    $scope.navigate('/');
                });
        }]);
