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
    $("#submit").click(function(){
        var title = $("#title").val();
        var post = $("#post").val();
        var options = [];
        $('#options div').children(".option").each(function() {
            options.push($(this).val());
        });
        var tags = $("#tags").val();
        console.log(tags);
        $.ajax({
            type: "POST",
            url: "asksubmit",
            data: {
                title: title,
                post: post,
                options: options,
                tags: tags
            },
            success: function(dat){
                if(dat=="success"){
                    alert("It worked");
                    window.location = "/";
                }
                else{
                    $(".error").html(dat);
                    $(".error").show();
                }
            },
            fail: function(dat){
                alert(dat);
            }
        });
        return false;
    });
});
