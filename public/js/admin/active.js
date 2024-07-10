function openApprove(){
    var formData=$("#hash-form").serialize();
    var trx_id=$("#trx-id").val();
    var hash=$("#hash").val();
    $.ajax({
        type:'post',
        url: 'ajax/approve.php',
        data:{'trx_id': trx_id, 'hash':hash},
        success: function(data){
            swal("Great!",data, "success");
        }
    })
}

function approve(id){
    $.ajax({
        type: 'post',
        url: 'ajax/approve-deposit.php',
        data: {'trx_id': id},
        success: function(data){
            swal("Great!",data, "success");
        }
    })
}

function gettrx(id){
     $.ajax({
        type:'post',
        url: 'ajax/trx.php',
        data:{'id':id},
        success: function(data){
            $("#trx-id").val(data)
            $("#trx-modal-btn").click()
        }
    })
}

function submit_form(){
var myFormData=$("#user-form").serialize();
disable_btn();
$.ajax({
'type':'post',
'url':'ajax/edit-portifolios.php',
'data':myFormData,
'success':function(data){
    alertify.alert(data);
    enable_btn();
}
});
}

function disable_btn(){
$("#user-submit").attr("disabled",true); 

}
function enable_btn(){
$("#user-submit").attr("disabled",false); 
}
function changeBalance(id){
$.ajax({
type: 'post',
url: 'ajax/get-balance.php',
data: {'folioId': id},
success: function(data){
    folioData=JSON.parse(data);
    console.log(folioData);
    $('#portifolioBalance').val(folioData.balance);
    $('#portifolioProfit').val(folioData.profit);
    var folioStatus = folioData.status;
    if(folioStatus=="active"){
        $("#active-no").attr("selected",false);
        $("#active-yes").attr("selected",true);
    }
    else{
        $("#active-yes").attr("selected",false);
        $("#active-no").attr("selected",true);
    }
}
})
}
function openModal(id){

$.ajax({
    type:'post',
    url:'ajax/get-portifolio.php',
    data:{'user_id':id},
    success:function(data){
        //console.log(id,data);
         
        var userdata=JSON.parse(data);
        console.log(userdata);
        
        $("#portifolioName").empty();
        userdata.map((data)=>{
            
            $("#portifolioName").prepend(data.options);
            
            
        });
        changeBalance($("#portifolioName").val());
        $("#user_id").val(id);
        //$("#portifolioBalance").val(data.portifolioBalance)
        //$("#inputEmail").val(userdata.options);

        //$("#lastName").val(userdata.name);
        //$("#inputEmail").val(userdata.email);
        //$("#inputNumber").val(userdata.phone);
        //$("#inputWallet").val(userdata.wallet);
        //$("#inputTotalInvestment").val(userdata.amount);
        //$("#inputBalance").val(parseInt(userdata.balance));
        //$("#inputPlan").val(userdata.plan);
        //$("#inputProfit").val(userdata.profit);

       if(userdata.active=="yes"){
           $("#active-yes").attr("selected",true);
       }else{     
            $("#active-no").attr("selected",true); 
        }
       
        document.getElementById("hiddenEditbtn").click();
    }
});
}
function openDecline(id){
$.ajax({
   type: "post",
   url: "ajax/decline-trx.php",
   data: {'id': id},
   success: function(data){
       swal("Great", data, "success");
   }
});
}