requirejs.config({
    baseUrl: 'js', // 'js' 라는 폴더를 기본 폴더로 설정한다. 
    paths:{
        'jquery': 'jquery-1.12.3.min',
        'globalAppSetting': 'globalAppSetting'
    },
});

requirejs(['jquery', 'globalAppSetting'], 
  function ($, globalAppSetting) {
    $(document).ready(function () {
      globalAppSetting.init();
    });
  }
);