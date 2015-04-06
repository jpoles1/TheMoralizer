$(function(){
    $.get("/getposts", function(resp){
        console.log(resp);
        $("#post-container").html(resp);
    });
});
