from django.db import models


class CarMake(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class CarModel(models.Model):
    make = models.ForeignKey(CarMake, related_name="models", on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    year = models.PositiveSmallIntegerField()
    dealer = models.CharField(max_length=100, blank=True)
    image = models.URLField(blank=True)

    class Meta:
        ordering = ["make__name", "name", "year"]
        unique_together = ("make", "name", "year")

    def __str__(self):
        return f"{self.year} {self.make.name} {self.name}"