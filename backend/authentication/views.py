from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token # Ensure this is correct
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user:
        # This line will now work correctly
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "username": user.username
        }, status=200)
    
    return Response({"detail": "Invalid Credentials"}, status=401)