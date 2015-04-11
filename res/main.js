$(function(){
    var pathname = window.location.pathname;
    var type = pathname.split('/')[1];
    console.log(type);
    if(type=="yourv"){
        $("#yourvlink").addClass("pure-menu-selected");
    }
    else if(type=="yourq"){
        $("#yourqlink").addClass("pure-menu-selected");
    }
    else{
        $("#homelink").addClass("pure-menu-selected");
    }
    $.get("/getposts/"+type, function(resp){
        $("#post-container").html(resp);
        $(".optionform").children(".button-secondary").bind( "click", function(){
            $(this).siblings(".pure-button-selected").removeClass("pure-button-selected");
            $(this).addClass("pure-button-selected");
        });
        $('.progress').children('.tooltip').tooltipster({
            position: "bottom"
        });
        $(".optionform").children(".button-success").click(function(){
            var subbutton = $(this);
            var choice = $(this).parent().children(".pure-button-selected").attr("optnum");
            if(!isNaN(choice)){
                var qid = $(this).parent().attr("id");
                $.ajax({
                    type: "POST",
                    url: "votesubmit",
                    data: {qid: qid, choice: choice},
                    success: function(resp){
                        if(resp=="success"){
                            subbutton.siblings(".button-secondary").unbind();
                            subbutton.remove();
                        }
                        else{
                            alert("Failed: "+resp);
                        }
                    }
                });
            }
        });
    });
});
