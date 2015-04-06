$(function(){
    $.get("/getposts", function(resp){
        $("#post-container").html(resp);
        $(".optionform").children(".button-secondary").bind( "click", function(){
            $(this).siblings(".pure-button-selected").removeClass("pure-button-selected");
            $(this).addClass("pure-button-selected");
        });
        $(".optionform").children(".button-success").click(function(){
            var subbutton = $(this);
            var choice = $(this).parent().children(".pure-button-selected").attr("optnum");
            var qid = $(this).parent().attr("id");
            $.ajax({
                type: "POST",
                url: "votesubmit",
                data: {qid: qid, choice: choice},
                success: function(resp){
                    alert(resp);
                    if(resp=="success"){
                        alert("TEST");
                        subbutton.siblings(".button-secondary").unbind();
                        subbutton.remove();
                    }
                    else{
                        alert("Failed");
                    }
                }
            });
        });
    });
});
