var captcha = "t";
$(function(){
    var numopt = 2;
    var maxopt = 10;

    $("#addo").click(function(){
        if(numopt < maxopt){
            numopt++;
            $("#options").append("<div style='position: relative'><input type='text' class='pure-input-1 option' display: inline;' placeholder='Option "+numopt+"' required><div class='removeopt' style='position: absolute; top: 3px; right: 10px;'><i class='fa fa-times-circle fa-2x'></i></div></div>");
        }
        return false;
    });
    $("#options").on("click", ".removeopt", function(){
        $(this).parent('div').remove();
        numopt--;
    });
    $("#submit").click(function(e){submitq(e)});
    $("#submitq").submit(function(e){submitq(e)});
});
var submitq = function(e){
    var title = $("#title").val();
    var post = $("#post").val();
    var options = [];
    $('#options div').children(".option").each(function() {
        options.push($(this).val().trim());
    });
    var tags = $("#tags").val();
    $.ajax({
        type: "POST",
        url: "asksubmit",
        data: {dat: JSON.stringify({
            title: title,
            post: post,
            opt: options,
            tags: tags,
            captcha: captcha
        })},
        success: function(dat){
            if(dat=="success"){
                alert("It worked");
                window.location = "/";
            }
            else{
                $(".error").html(dat);
                $(".error").show();
                $('html,body').animate({ scrollTop: $(".error").offset().top-80}, 600);
            }
        },
        fail: function(dat){
            alert(dat);
        }
    });
    e.preventDefault();
}
var setupCaptcha = function(){
    grecaptcha.render('g-recaptcha', {
      'sitekey' : '6Lc82wQTAAAAACf78hAgAbZh73k6tGpPZwpUfNvc',
      'callback' : function(resp){
          captcha = resp;
      }
    });
}
