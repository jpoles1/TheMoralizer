var login = function(uname){
    location.reload();
}
$(function(){
    $('a[href^="#"]').click(function() {

        $('html,body').animate({ scrollTop: $(this.hash).offset().top}, 600);

        return false;

        e.preventDefault();

    });
    $("#signin").submit(function(){
        var uname = $("#signinuname").val();
        var passw = $("#signinpass").val();
        $.ajax({
            type: "POST",
            url: "signin",
            data: {uname: uname, pass: md5(uname+passw)},
            success: function(dat){
                if(dat=="correct"){
                    login(uname);
                }
                else{
                    $("#signinerror").html(dat);
                    $("#signinerror").show();
                }
            },
            fail: function(dat){
                alert(dat);
            }
        });
        return false;
    });
    $("#signup").submit(function(){
        var email = $("#email").val();
        var uname = $("#signupuname").val();
        var passw = $("#signuppass").val();
        var regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
        if(passw.match(regex)==null){
            $("#signuperror").html("Password must be between 6 to 20 characters and contain at least one numeric digit, one uppercase and one lowercase letter");
            $("#signuperror").show();
        }
        else{
            $.ajax({
                type: "POST",
                url: "signup",
                data: {uname: uname, email: email, pass: md5(uname+passw)},
                success: function(dat){
                    if(dat=="success"){
                        login(uname);
                    }
                    else{
                        $("#signuperror").html(dat);
                        $("#signuperror").show();
                    }
                },
                fail: function(dat){
                    alert(dat);
                }
            });
        }
        return false;
    });
});
