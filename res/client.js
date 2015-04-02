var x = "test";
$(function(){
    $('a[href^="#"]').click(function() {

        $('html,body').animate({ scrollTop: $(this.hash).offset().top}, 600);

        return false;

        e.preventDefault();

    });
    $("#signupsubmit").click(function(){
        var email = $("#email").val();
        var uname = $("#signupuname").val();
        var passw = $("#signuppass").val();
        $.post("signup", {uname: uname, email: email, pass: passw}, function(dat){
            alert(dat);
            if(dat=="success"){
                pass;
            }
            else{
                $("#signuperror").html(dat);
                $("#signuperror").show();
                return false;
            }
        });
    });
});
