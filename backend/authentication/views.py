from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token # Ensure this is correct
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated

from .rbac import build_auth_payload

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user:
        # This line will now work correctly
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                **build_auth_payload(user),
            },
            status=200,
        )
    
    return Response({"detail": "Invalid Credentials"}, status=401)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(build_auth_payload(request.user), status=200)
