var x = "test";
$(function(){
    $('a[href^="#"]').click(function() {

        $('html,body').animate({ scrollTop: $(this.hash).offset().top}, 600);

        return false;

        e.preventDefault();

    });
    $("#signup").submit(function(){
        var email = $("#email").val();
        var uname = $("#signupuname").val();
        var passw = $("#signuppass").val();
        var date = new Date();
        $.ajax({
            type: "POST",
            url: "signup",
            data: {uname: uname, email: email, pass: md5(date.getUTCMonth()+uname+passw+date.getUTCDay()+date.getUTCFullYear())},
            success: function(dat){
                if(dat=="success"){
                    alert("yay");
                    location.reload();
                }
                else{
                    $("#signuperror").html(dat);
                    $("#signuperror").show();
                    return false;
                }
            },
            fail: function(dat){
                alert(dat);
            }
        });
        return false;
    });
});
