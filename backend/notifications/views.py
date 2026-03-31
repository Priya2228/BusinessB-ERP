from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.views import APIView
from .models import DeviceToken
from .serializers import DeviceTokenSerializer, InventoryAlertSyncSerializer
from .services import sync_inventory_alerts

class DeviceTokenViewSet(viewsets.ModelViewSet):
    authentication_classes = [TokenAuthentication]
    serializer_class = DeviceTokenSerializer
    permission_classes = [IsAuthenticated]
    queryset = DeviceToken.objects.all()

    def get_queryset(self):
        return DeviceToken.objects.filter(user=self.request.user).order_by('-updated_at')

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Update or create token for the current user
        token, created = DeviceToken.objects.update_or_create(
            token=serializer.validated_data['token'],
            defaults={
                'user': request.user,
                'platform': serializer.validated_data['platform'],
                'is_active': True
            }
        )
        return Response(status=status.HTTP_201_CREATED)


class InventoryAlertSyncView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InventoryAlertSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = sync_inventory_alerts(serializer.validated_data['alerts'])
        return Response(result, status=status.HTTP_200_OK)
